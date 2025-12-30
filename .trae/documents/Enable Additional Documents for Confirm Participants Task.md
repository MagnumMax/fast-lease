I will enable the "Additional Documents" section for the "Confirm Participants" task. This involves a small change in the frontend component that handles task details.

### Implementation Steps

1.  **Modify `app/(dashboard)/ops/_components/task-detail.tsx`**:
    *   Add logic to identify the "Confirm Participants" task (`CONFIRM_PARTICIPANTS`).
    *   Update the `enableDocsSection` condition to include this task type.
    *   This will reveal the existing "Upload additional documents" UI for this specific task.

### Why this works
*   The "Additional Documents" component is already implemented and used in other tasks.
*   The backend action (`completeTaskFormAction`) already handles arbitrary document uploads from this section, saving them with `isAdditional: true`.
*   The "Deal Documents" view (`WorkflowDocuments`) already has logic to display these "Additional Documents".

No changes are needed in `workflow_template.yaml` or backend actions, as the generic "additional documents" mechanism is sufficient.