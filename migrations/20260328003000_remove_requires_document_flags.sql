-- Remove requires_document from task payloads (switching to field-level required)

UPDATE tasks
SET payload = payload - 'requires_document'
WHERE payload ? 'requires_document';
