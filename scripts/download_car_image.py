import argparse
import json
import ssl
import sys
import urllib.parse
import urllib.request
from pathlib import Path


def _open_with_headers(url: str, *, timeout: int, context: ssl.SSLContext | None):
    # Wikipedia requires a descriptive User-Agent with contact details.
    headers = {
        "User-Agent": "fast-lease-image-fetch/1.0 (+mailto:care@fastlease.ae)"
    }
    request = urllib.request.Request(url, headers=headers)
    return urllib.request.urlopen(request, context=context, timeout=timeout)


def fetch_wikipedia_image(query: str, *, insecure_ssl: bool = False) -> tuple[str, bytes]:
    """
    Resolve a Wikipedia image URL for the given query and download the bytes.
    Returns a tuple of the resolved image URL and the binary content.
    """
    slug = query.replace(" ", "_")
    summary_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(slug)}"

    context = ssl._create_unverified_context() if insecure_ssl else None

    with _open_with_headers(summary_url, timeout=15, context=context) as response:
        data = json.load(response)

    image_url = (
        data.get("originalimage", {}).get("source")
        or data.get("thumbnail", {}).get("source")
    )
    if not image_url:
        raise RuntimeError(f"No image URL found for query '{query}'.")

    with _open_with_headers(image_url, timeout=30, context=context) as response:
        content = response.read()

    return image_url, content


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Download a representative image for a car using the Wikipedia summary API."
    )
    parser.add_argument("--name", required=True, help="Car name to search on Wikipedia, e.g. 'Lamborghini Huracan'.")
    parser.add_argument(
        "--output",
        required=True,
        help="Output file path where the image will be saved, e.g. 'public/assets/lamborghini-huracan.jpg'.",
    )
    parser.add_argument(
        "--insecure-ssl",
        action="store_true",
        help="Skip TLS certificate verification (useful if the environment lacks CA bundle).",
    )
    args = parser.parse_args()

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        image_url, content = fetch_wikipedia_image(args.name, insecure_ssl=args.insecure_ssl)
    except Exception as exc:
        print(f"Failed to download image for '{args.name}': {exc}", file=sys.stderr)
        return 1

    output_path.write_bytes(content)
    print(f"Downloaded image from {image_url}")
    print(f"Saved to {output_path.resolve()}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
