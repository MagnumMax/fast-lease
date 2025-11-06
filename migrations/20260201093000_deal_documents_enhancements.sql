-- Improve deal_documents schema to align with client/vehicle document records.

alter table public.deal_documents
  add column if not exists document_category text,
  add column if not exists mime_type text,
  add column if not exists file_size bigint,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists uploaded_at timestamptz not null default timezone('utc', now()),
  add column if not exists uploaded_by uuid references auth.users(id);

-- Backfill document categories using known mappings.
update public.deal_documents
set document_category = case
  when lower(coalesce(document_type, '')) in (
    'contract',
    'lease_agreement',
    'payment_schedule',
    'investment_agreement',
    'vehicle_purchase_agreement',
    'vehicle_sale_contract',
    'commercial_license',
    'vat_registration_certificate'
  ) then 'required'
  when lower(coalesce(document_type, '')) in (
    'assigning_letter',
    'authorization_letter',
    'memorandum_of_understanding',
    'sale_confirmation'
  ) then 'signature'
  when lower(coalesce(document_type, '')) in (
    'receipt_voucher',
    'termination_contract',
    'tax_credit_note'
  ) then 'archived'
  when document_category is null then 'other'
  else document_category
end
where document_category is null;
