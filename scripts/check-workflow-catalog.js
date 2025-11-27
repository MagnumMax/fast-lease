#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const sourcePath = path.join(process.cwd(), "docs", "workflow_template.yaml");
const snapshotPath = path.join(process.cwd(), "lib", "workflow", "catalog.runtime.json");

function loadYaml(pathname) {
  const source = fs.readFileSync(pathname, "utf8");
  return yaml.parse(source);
}

function loadJson(pathname) {
  const source = fs.readFileSync(pathname, "utf8");
  return JSON.parse(source);
}

function stableStringify(value) {
  return JSON.stringify(value, Object.keys(value).sort(), 2);
}

function main() {
  const yamlData = loadYaml(sourcePath);
  const jsonData = loadJson(snapshotPath);

  const yamlStr = stableStringify(yamlData);
  const jsonStr = stableStringify(jsonData);

  if (yamlStr !== jsonStr) {
    console.error(
      "catalog.runtime.json is stale. Run `pnpm workflow:sync-catalog` to regenerate from docs/workflow_template.yaml.",
    );
    process.exit(1);
  }

  console.log("Workflow catalog snapshot is in sync with docs/workflow_template.yaml.");
}

main();
