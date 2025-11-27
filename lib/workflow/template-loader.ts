import { readFileSync } from "node:fs";

import { parseWorkflowTemplate, WorkflowTemplateParseError } from "./parser";
import type { WorkflowTemplate } from "./types";

// Keep filesystem access isolated to server environments to avoid bundling fs in client code.
export const loadWorkflowTemplate = (filePath: string): WorkflowTemplate => {
  try {
    const fileContents = readFileSync(filePath, "utf-8");
    return parseWorkflowTemplate(fileContents);
  } catch (error) {
    if (error instanceof WorkflowTemplateParseError) {
      throw error;
    }

    throw new WorkflowTemplateParseError(
      `Failed to load workflow template from ${filePath}`,
      error,
    );
  }
};
