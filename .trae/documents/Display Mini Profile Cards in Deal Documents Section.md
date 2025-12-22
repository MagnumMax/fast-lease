I will implement the display of mini profile cards in the "Deal Documents" section for the "Confirm Deal Participants" task block.

1.  **Create a reusable Profile Card Component**:
    *   Create `app/(dashboard)/ops/_components/profile-card-mini.tsx` to encapsulate the mini-card UI logic used for displaying profile details (Name, Email, Phone, Documents).

2.  **Update `WorkflowDocuments` Component**:
    *   Modify `app/(dashboard)/ops/_components/workflow-documents.tsx`.
    *   Update `WorkflowDocumentEntry` type to include a new `kind: "profile_card"` and a `profileData` field.
    *   Update the rendering loop to display `ProfileCardMini` when the entry kind is `profile_card`.

3.  **Update Task Detail Page Logic**:
    *   Modify `app/(dashboard)/ops/tasks/[id]/page.tsx`.
    *   Move the construction of `buyerProfileSummary`, `sellerProfileSummary`, and `brokerProfileSummary` earlier in the code (before `financeSnapshot` creation).
    *   Update `DealTaskSnapshot` type to include the task `type`.
    *   Update `TaskSchemaEntry` type to include `profile_card` kind.
    *   Modify `buildTaskDocumentGroups` function to accept `profileSummaries`.
    *   Inside `buildTaskDocumentGroups`, detect if the task is `CONFIRM_PARTICIPANTS` and transform the `client_id`, `seller_id`, and `broker_id` parameter fields into `profile_card` entries, populating them with the relevant profile summary data.
