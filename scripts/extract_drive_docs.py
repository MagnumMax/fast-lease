#!/usr/bin/env python3
"""Extract structured FastLease data from Google Drive documents.

This utility connects to Google Drive and Google Docs using a service account,
walks through the configured folder, and tries to map semi-structured content
to the target data schema (see `docs/real_data_ingest_structure.md`).

Usage example:

    python scripts/extract_drive_docs.py \
        --credentials path/to/service-account.json \
        --config configs/drive_ingest.yaml

Dependencies (install via pip):
    google-api-python-client
    google-auth
    PyYAML

The script writes structured JSON to `<output_dir>/aggregated_data.json` and
optionally dumps raw text/tables for manual QA as configured.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import yaml
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

try:  # Optional Gemini dependency
    import google.generativeai as genai
except ImportError:  # pragma: no cover - handled gracefully at runtime
    genai = None


SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
]


@dataclass
class DocumentMatch:
    """Result describing the mapping between a document and a target collection."""

    name: str
    target_collection: str
    field_map: Dict[str, Any]


def load_config(path: Path) -> Dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        config = yaml.safe_load(handle)
    if not isinstance(config, dict):
        raise ValueError("Config root must be a mapping")
    return config


def build_services(credentials_path: Path):
    credentials = Credentials.from_service_account_file(
        str(credentials_path), scopes=SCOPES
    )
    drive_service = build("drive", "v3", credentials=credentials)
    docs_service = build("docs", "v1", credentials=credentials)
    return drive_service, docs_service


def normalize_key(value: str) -> str:
    cleaned = re.sub(r"[^0-9a-zA-Z\u0400-\u04FF]+", " ", value.lower())
    return cleaned.strip()


def set_nested(target: Dict[str, Any], field_path: str, value: Any) -> None:
    parts = field_path.split(".")
    cursor = target
    for part in parts[:-1]:
        cursor = cursor.setdefault(part, {})
    cursor[parts[-1]] = value


def has_nested(target: Dict[str, Any], field_path: str) -> bool:
    parts = field_path.split(".")
    cursor = target
    for part in parts:
        if not isinstance(cursor, dict) or part not in cursor:
            return False
        cursor = cursor[part]
    return True


def flatten_nested_keys(source: Dict[str, Any], prefix: str = "") -> List[str]:
    keys: List[str] = []
    for key, value in source.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            keys.extend(flatten_nested_keys(value, path))
        else:
            keys.append(path)
    return keys


def flatten_dict_values(source: Dict[str, Any], prefix: str = "") -> List[Tuple[str, Any]]:
    items: List[Tuple[str, Any]] = []
    for key, value in source.items():
        path = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            items.extend(flatten_dict_values(value, path))
        else:
            items.append((path, value))
    return items


def default_json_serializer(value: Any):
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value)!r} is not JSON serializable")


def extract_text_from_paragraph(paragraph: Dict[str, Any]) -> str:
    text_chunks: List[str] = []
    for element in paragraph.get("elements", []):
        text_run = element.get("textRun")
        if not text_run:
            continue
        content = text_run.get("content", "")
        text_chunks.append(content)
    text = "".join(text_chunks).strip()
    return text


def extract_tables(document: Dict[str, Any]) -> List[List[List[str]]]:
    tables: List[List[List[str]]] = []
    for element in document.get("body", {}).get("content", []):
        table = element.get("table")
        if not table:
            continue
        rows_data: List[List[str]] = []
        for row in table.get("tableRows", []):
            row_values: List[str] = []
            for cell in row.get("tableCells", []):
                cell_texts: List[str] = []
                for cell_element in cell.get("content", []):
                    paragraph = cell_element.get("paragraph")
                    if paragraph:
                        cell_texts.append(extract_text_from_paragraph(paragraph))
                row_values.append(" ".join(filter(None, cell_texts)).strip())
            rows_data.append(row_values)
        tables.append(rows_data)
    return tables


def extract_text_lines(document: Dict[str, Any]) -> List[str]:
    lines: List[str] = []
    for element in document.get("body", {}).get("content", []):
        paragraph = element.get("paragraph")
        if not paragraph:
            continue
        text = extract_text_from_paragraph(paragraph)
        if text:
            split_lines = [line.strip() for line in text.splitlines() if line.strip()]
            lines.extend(split_lines)
    return lines


def extract_key_value_pairs(
    lines: Iterable[str], tables: Iterable[List[List[str]]]
) -> Dict[str, str]:
    pairs: Dict[str, str] = {}
    pattern = re.compile(r"^([^:]+):\s*(.+)$")
    for raw_line in lines:
        match = pattern.match(raw_line)
        if match:
            key = normalize_key(match.group(1))
            value = match.group(2).strip()
            pairs[key] = value
    for table in tables:
        for row in table:
            if len(row) != 2:
                continue
            key_candidate, value_candidate = row
            if not key_candidate or not value_candidate:
                continue
            match = pattern.match(f"{key_candidate}: {value_candidate}")
            if match:
                key = normalize_key(match.group(1))
                value = match.group(2).strip()
                pairs[key] = value
    return pairs


def parse_int(value: str) -> Optional[int]:
    digits = re.findall(r"[-+]?[0-9]+", value.replace(" ", ""))
    if not digits:
        return None
    try:
        return int(digits[0])
    except ValueError:
        return None


def parse_decimal(value: str, decimal_replace: Sequence[str]) -> Optional[Decimal]:
    cleaned = value.strip()
    for token in decimal_replace:
        cleaned = cleaned.replace(token, "")
    cleaned = cleaned.replace(",", ".")
    match = re.search(r"[-+]?[0-9]+(?:\.[0-9]+)?", cleaned)
    if not match:
        return None
    try:
        return Decimal(match.group(0))
    except InvalidOperation:
        return None


def parse_percent(
    value: str, decimal_replace: Sequence[str], percent_suffixes: Sequence[str]
) -> Optional[Decimal]:
    cleaned = value.strip().lower()
    for suffix in percent_suffixes:
        cleaned = cleaned.replace(suffix.lower(), "")
    decimal_value = parse_decimal(cleaned, decimal_replace)
    if decimal_value is None:
        return None
    return decimal_value / Decimal(100)


def parse_list(value: str, separators: Sequence[str]) -> List[str]:
    tokens = [value]
    for separator in separators:
        next_tokens: List[str] = []
        for token in tokens:
            next_tokens.extend(token.split(separator))
        tokens = next_tokens
    return [token.strip() for token in tokens if token.strip()]


def parse_date(value: str) -> Optional[str]:
    candidates = [
        "%Y-%m-%d",
        "%d.%m.%Y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%d-%m-%Y",
        "%d %B %Y",
        "%B %d, %Y",
    ]
    for fmt in candidates:
        try:
            parsed = datetime.strptime(value.strip(), fmt)
            return parsed.date().isoformat()
        except ValueError:
            continue
    return None


def parse_schedule(value: str, decimal_replace: Sequence[str]) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    for line in value.splitlines():
        if not line.strip():
            continue
        if ":" not in line and "-" not in line:
            continue
        separators = [":", "-", "\u2013", "\u2014"]
        parts = None
        for sep in separators:
            if sep in line:
                parts = [part.strip() for part in line.split(sep, 1)]
                break
        if not parts or len(parts) != 2:
            continue
        date_candidate, amount_candidate = parts
        parsed_date = parse_date(date_candidate) or date_candidate
        amount_decimal = parse_decimal(amount_candidate, decimal_replace)
        entries.append(
            {
                "due_date": parsed_date,
                "amount": float(amount_decimal) if amount_decimal is not None else amount_candidate,
            }
        )
    return entries


class GoogleDriveWalker:
    def __init__(self, drive_service, recursive: bool):
        self.drive_service = drive_service
        self.recursive = recursive

    def iterate_documents(self, folder_id: str) -> Iterable[Dict[str, Any]]:
        queue: List[str] = [folder_id]
        while queue:
            current = queue.pop(0)
            for item in self._list_children(current):
                mime_type = item.get("mimeType")
                if (
                    mime_type == "application/vnd.google-apps.folder"
                    and self.recursive
                ):
                    queue.append(item["id"])
                    continue
                yield item

    def _list_children(self, folder_id: str) -> List[Dict[str, Any]]:
        items: List[Dict[str, Any]] = []
        page_token: Optional[str] = None
        query = f"'{folder_id}' in parents and trashed = false"
        fields = "nextPageToken, files(id, name, mimeType, createdTime, modifiedTime, webViewLink)"
        while True:
            response = (
                self.drive_service.files()
                .list(q=query, fields=fields, pageToken=page_token)
                .execute()
            )
            items.extend(response.get("files", []))
            page_token = response.get("nextPageToken")
            if not page_token:
                break
        return items


class DocumentClassifier:
    def __init__(self, document_types: List[Dict[str, Any]]):
        self.document_types = document_types

    def match(
        self, title: str, text_lines: Sequence[str]
    ) -> Optional[DocumentMatch]:
        title_normalized = title.lower()
        content_blob = "\n".join(text_lines).lower()
        for doc_type in self.document_types:
            title_keywords = doc_type.get("title_keywords", [])
            content_keywords = doc_type.get("content_keywords", [])
            if title_keywords and not any(
                keyword.lower() in title_normalized for keyword in title_keywords
            ):
                continue
            if content_keywords and not any(
                keyword.lower() in content_blob for keyword in content_keywords
            ):
                continue
            return DocumentMatch(
                name=doc_type.get("name", "unknown"),
                target_collection=doc_type["target_collection"],
                field_map=doc_type.get("field_map", {}),
            )
        return None


class DocumentParser:
    def __init__(self, config: Dict[str, Any]):
        parsing_config = config.get("parsing", {})
        self.list_separators: Sequence[str] = parsing_config.get(
            "list_separators", [",", ";", "\n", "|"]
        )
        self.decimal_replace: Sequence[str] = parsing_config.get(
            "decimal_replace", [",", " "]
        )
        self.percent_suffixes: Sequence[str] = parsing_config.get(
            "percent_suffixes", ["%"]
        )

    def parse_value(self, raw_value: Any, parser: Optional[str]) -> Any:
        if parser is None:
            return raw_value.strip() if isinstance(raw_value, str) else raw_value
        parser = parser.lower()
        value_str = raw_value if isinstance(raw_value, str) else str(raw_value)
        if parser == "int":
            parsed = parse_int(value_str)
            return parsed if parsed is not None else raw_value
        if parser == "decimal":
            parsed = parse_decimal(value_str, self.decimal_replace)
            return parsed if parsed is not None else raw_value
        if parser == "percent":
            parsed = parse_percent(value_str, self.decimal_replace, self.percent_suffixes)
            return parsed if parsed is not None else raw_value
        if parser == "list":
            return raw_value if isinstance(raw_value, list) else parse_list(value_str, self.list_separators)
        if parser == "date":
            parsed = parse_date(value_str)
            return parsed if parsed is not None else raw_value
        if parser == "schedule":
            return (
                raw_value
                if isinstance(raw_value, list)
                else parse_schedule(value_str, self.decimal_replace)
            )
        logging.warning("Unknown parser '%s', returning raw value", parser)
        return raw_value


class GeminiClient:
    DEFAULT_PROMPT = (
        "You are an assistant that extracts structured leasing data for the FastLease "
        "platform. Use only the provided document text and tables. For every requested "
        "field return a value or null. Do not invent values. Respond strictly with a "
        "single JSON object using the exact field names from the schema hint."
        "\n\n"
        "Document title: {document_title}\n"
        "Target entity type: {target_type}\n"
        "Schema hint (field -> parser):\n{schema_hint}\n\n"
        "Plain text:\n{document_text}\n\n"
        "Tables (JSON):\n{tables_json}\n"
    )

    def __init__(self, config: Dict[str, Any]):
        self.enabled = config.get("enabled", False)
        self.api_key_env = config.get("api_key_env", "GEMINI_API_KEY")
        self.model_name = config.get("model", "models/gemini-1.5-flash-latest")
        self.temperature = config.get("temperature", 0.2)
        self.top_p = config.get("top_p", 0.95)
        self.top_k = config.get("top_k", 32)
        self.max_output_tokens = config.get("max_output_tokens", 2048)
        self.system_instruction = config.get("system_instruction")
        self.prompt_template = config.get("prompt_template", self.DEFAULT_PROMPT)
        self.response_mime_type = config.get("response_mime_type", "application/json")
        self._model = None

        if not self.enabled:
            return
        if genai is None:
            raise RuntimeError(
                "Gemini integration enabled but google-generativeai is not installed"
            )
        api_key = os.environ.get(self.api_key_env)
        if not api_key:
            raise RuntimeError(
                f"Gemini integration enabled but environment variable {self.api_key_env} is missing"
            )
        genai.configure(api_key=api_key)
        self._model = genai.GenerativeModel(
            model_name=self.model_name,
            system_instruction=self.system_instruction,
        )

    def extract(
        self,
        *,
        document_title: str,
        target_type: str,
        field_map: Dict[str, Any],
        text_lines: Sequence[str],
        tables: Sequence[List[List[str]]],
    ) -> Tuple[Dict[str, Any], Optional[str]]:
        if not self.enabled or not self._model:
            return {}, None

        schema_hint = []
        for field_path, mapping in field_map.items():
            if isinstance(mapping, dict):
                parser_name = mapping.get("parser")
            else:
                parser_name = None
            schema_hint.append({"field": field_path, "parser": parser_name or "raw"})

        prompt = self.prompt_template.format(
            document_title=document_title,
            target_type=target_type,
            schema_hint=json.dumps(schema_hint, ensure_ascii=False, indent=2),
            document_text="\n".join(text_lines),
            tables_json=json.dumps(tables, ensure_ascii=False, indent=2),
        )

        generation_config = None
        if hasattr(genai, "GenerationConfig"):
            generation_config = genai.GenerationConfig(
                temperature=self.temperature,
                top_p=self.top_p,
                top_k=self.top_k,
                max_output_tokens=self.max_output_tokens,
                response_mime_type=self.response_mime_type,
            )

        try:
            response = self._model.generate_content(
                prompt,
                generation_config=generation_config,
            )
        except Exception as error:  # pragma: no cover - network failure handling
            logging.error("Gemini request failed: %s", error)
            return {}, str(error)

        text_response = getattr(response, "text", None)
        if not text_response:
            parts: List[str] = []
            for candidate in getattr(response, "candidates", []) or []:
                content = getattr(candidate, "content", None)
                if not content:
                    continue
                for part in getattr(content, "parts", []) or []:
                    part_text = getattr(part, "text", None)
                    if part_text:
                        parts.append(part_text)
            text_response = "\n".join(parts).strip()

        if not text_response:
            logging.warning("Gemini returned empty response")
            return {}, "empty response"

        try:
            payload = json.loads(text_response)
        except json.JSONDecodeError as error:
            logging.error("Gemini response is not valid JSON: %s", error)
            return {}, f"invalid json: {error}"

        if not isinstance(payload, dict):
            logging.error("Gemini response must be a JSON object, got %s", type(payload))
            return {}, "response not object"

        flat_values = flatten_dict_values(payload)
        filtered: Dict[str, Any] = {}
        permitted_fields = {item["field"] for item in schema_hint}
        for field_path, value in flat_values:
            if field_path not in permitted_fields:
                continue
            filtered[field_path] = value
        return filtered, None

class ExtractionEngine:
    GOOGLE_DOC_MIME = "application/vnd.google-apps.document"

    def __init__(
        self,
        drive_service,
        docs_service,
        config: Dict[str, Any],
        output_dir: Path,
    ):
        self.drive = drive_service
        self.docs = docs_service
        self.config = config
        self.output_dir = output_dir
        self.raw_export = config.get("raw_export", {})
        self.parser = DocumentParser(config)
        self.classifier = DocumentClassifier(config.get("document_types", []))
        self.gemini: Optional[GeminiClient] = None
        gemini_config = config.get("gemini")
        if gemini_config:
            try:
                self.gemini = GeminiClient(gemini_config)
            except Exception as error:  # pragma: no cover - configuration failures
                logging.error("Gemini initialisation failed, falling back to rule-based parsing: %s", error)
                self.gemini = None
        self.report: List[Dict[str, Any]] = []
        self.aggregated: Dict[str, List[Dict[str, Any]]] = defaultdict(list)

    def run(self, folder_id: str, recursive: bool) -> None:
        walker = GoogleDriveWalker(self.drive, recursive=recursive)
        for metadata in walker.iterate_documents(folder_id):
            document_id = metadata["id"]
            mime_type = metadata.get("mimeType")
            title = metadata.get("name", document_id)
            logging.info("Processing '%s' (%s)", title, mime_type)
            if mime_type == self.GOOGLE_DOC_MIME:
                self._handle_google_doc(metadata)
            else:
                self._handle_artifact(metadata)
        self._write_outputs()

    def _handle_google_doc(self, metadata: Dict[str, Any]) -> None:
        document_id = metadata["id"]
        try:
            document = (
                self.docs.documents().get(documentId=document_id).execute()
            )
        except HttpError as error:
            logging.error("Failed to fetch document %s: %s", document_id, error)
            return
        text_lines = extract_text_lines(document)
        tables = extract_tables(document)
        key_values = extract_key_value_pairs(text_lines, tables)

        match = self.classifier.match(metadata.get("name", ""), text_lines)
        record: Dict[str, Any] = {
            "external_id": document.get("documentId"),
            "source_document": {
                "id": document_id,
                "title": metadata.get("name"),
                "url": metadata.get("webViewLink")
                or f"https://docs.google.com/document/d/{document_id}/edit",
            },
        }

        missing_fields: set[str] = set()
        extracted_fields: set[str] = set()
        gemini_error: Optional[str] = None
        gemini_used = False

        if match:
            field_parsers: Dict[str, Optional[str]] = {}
            for field_path, mapping in match.field_map.items():
                if isinstance(mapping, dict):
                    keys = mapping.get("keys", [])
                    parser_name = mapping.get("parser")
                else:
                    keys = mapping
                    parser_name = None
                field_parsers[field_path] = parser_name
                value = self._lookup_value(keys, key_values)
                if value is None:
                    continue
                parsed_value = self.parser.parse_value(value, parser_name)
                set_nested(record, field_path, parsed_value)
                extracted_fields.add(field_path)
            missing_fields = set(field_parsers.keys()) - extracted_fields

            if self.gemini:
                gemini_used = True
                gemini_payload, gemini_error = self.gemini.extract(
                    document_title=metadata.get("name", ""),
                    target_type=match.name,
                    field_map=match.field_map,
                    text_lines=text_lines,
                    tables=tables,
                )
                for field_path, raw_value in gemini_payload.items():
                    if raw_value in (None, ""):
                        continue
                    parser_name = field_parsers.get(field_path)
                    parsed_value = raw_value
                    if parser_name:
                        parsed_value = self.parser.parse_value(raw_value, parser_name)
                    set_nested(record, field_path, parsed_value)
                    extracted_fields.add(field_path)
                    if field_path in missing_fields:
                        missing_fields.discard(field_path)
            target_collection = match.target_collection
        else:
            target_collection = "artifacts"
            missing_fields = set()
            extracted_fields = set()

        self._persist_raw_export(metadata, text_lines, tables)

        # Keep track of parsing diagnostics
        self.report.append(
            {
                "document_id": metadata.get("id"),
                "title": metadata.get("name"),
                "matched_type": match.name if match else None,
                "extracted_fields": sorted(extracted_fields),
                "missing_fields": sorted(missing_fields),
                "gemini_used": gemini_used,
                "gemini_error": gemini_error,
            }
        )

        self.aggregated[target_collection].append(record)

    def _handle_artifact(self, metadata: Dict[str, Any]) -> None:
        record = {
            "external_id": metadata["id"],
            "title": metadata.get("name"),
            "mime_type": metadata.get("mimeType"),
            "url": metadata.get("webViewLink"),
        }
        self.report.append(
            {
                "document_id": metadata.get("id"),
                "title": metadata.get("name"),
                "matched_type": None,
                "extracted_fields": [],
                "missing_fields": [],
            }
        )
        self.aggregated["artifacts"].append(record)

    def _lookup_value(
        self, keys: Sequence[str], key_values: Dict[str, str]
    ) -> Optional[str]:
        for key in keys:
            normalized = normalize_key(key)
            if normalized in key_values:
                return key_values[normalized]
        return None

    def _persist_raw_export(
        self,
        metadata: Dict[str, Any],
        text_lines: Sequence[str],
        tables: Sequence[List[List[str]]],
    ) -> None:
        if not self.raw_export.get("enabled", False):
            return
        directory = Path(self.raw_export.get("directory", "output/raw"))
        directory.mkdir(parents=True, exist_ok=True)
        safe_name = re.sub(r"[^0-9a-zA-Z\u0400-\u04FF]+", "_", metadata.get("name", "doc"))
        text_path = directory / f"{safe_name}_{metadata['id']}.md"
        tables_path = directory / f"{safe_name}_{metadata['id']}.tables.json"
        if self.raw_export.get("include_text_md", True):
            with text_path.open("w", encoding="utf-8") as handle:
                handle.write("\n".join(text_lines))
        if self.raw_export.get("include_tables_csv", True):
            with tables_path.open("w", encoding="utf-8") as handle:
                json.dump(tables, handle, ensure_ascii=False, indent=2)

    def _write_outputs(self) -> None:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        aggregated_path = self.output_dir / "aggregated_data.json"
        report_path = self.output_dir / "parsing_report.json"
        with aggregated_path.open("w", encoding="utf-8") as handle:
            json.dump(
                self.aggregated,
                handle,
                ensure_ascii=False,
                indent=2,
                default=default_json_serializer,
            )
        with report_path.open("w", encoding="utf-8") as handle:
            json.dump(self.report, handle, ensure_ascii=False, indent=2)


def configure_logging(level: str) -> None:
    numeric_level = getattr(logging, level.upper(), logging.INFO)
    logging.basicConfig(
        level=numeric_level,
        format="%(asctime)s - %(levelname)s - %(message)s",
    )


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Extract FastLease data from Google Docs")
    parser.add_argument(
        "--credentials",
        type=Path,
        required=True,
        help="Path to the Google service account JSON file",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=Path("configs/drive_ingest.yaml"),
        help="Path to the YAML configuration file",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Override output directory",
    )
    args = parser.parse_args(argv)

    config = load_config(args.config)
    log_level = config.get("log_level", "INFO")
    configure_logging(log_level)

    try:
        drive_service, docs_service = build_services(args.credentials)
    except Exception as error:  # pylint: disable=broad-except
        logging.error("Failed to initialise Google API clients: %s", error)
        return 1

    output_dir = args.output or Path(config.get("output_dir", "output"))
    folder_id = config["folder_id"]
    recursive = config.get("recursive", True)

    engine = ExtractionEngine(drive_service, docs_service, config, output_dir)
    engine.run(folder_id, recursive)

    logging.info("Extraction completed. Aggregated data saved to %s", output_dir)
    return 0


if __name__ == "__main__":
    sys.exit(main())
