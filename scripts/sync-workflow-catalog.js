#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const yaml = require("yaml");

const sourcePath = path.join(process.cwd(), "docs", "workflow_template.yaml");
const targetPath = path.join(process.cwd(), "lib", "workflow", "catalog.runtime.json");

function main() {
  const source = fs.readFileSync(sourcePath, "utf8");
  const parsed = yaml.parse(source);
  fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2));
  console.log(`Synced workflow template to ${path.relative(process.cwd(), targetPath)}`);
}

main();
