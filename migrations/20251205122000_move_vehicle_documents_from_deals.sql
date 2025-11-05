-- Normalize and migrate deal_documents entries into vehicle_documents and client_documents.

with deal_docs as (
  select
    dd.id,
    dd.deal_id,
    dd.document_type,
    dd.title,
    dd.status,
    dd.storage_path,
    dd.signed_at,
    dd.created_at,
    d.vehicle_id,
    d.client_id,
    regexp_replace(lower(coalesce(dd.document_type, '')),
      '[^a-z0-9]+', '_', 'g') as doc_type_slug
  from public.deal_documents dd
  join public.deals d on d.id = dd.deal_id
  where dd.storage_path is not null
), normalized as (
  select
    deal_docs.*,
    case
      when doc_type_slug = '' then null
      when doc_type_slug = 'insurance_policy_tax_invoice' then 'insurance_policy_with_tax_invoice'
      when doc_type_slug = 'id_card' then 'identity_card'
      when doc_type_slug in ('commercial_license', 'business_registration_documents', 'company_registration_documents', 'corporate_documents', 'company_and_transaction_documents')
        then 'company_license'
      else doc_type_slug
    end as canonical_type
  from deal_docs
), vehicle_candidates as (
  select *
  from normalized
  where vehicle_id is not null
    and canonical_type = any (array[
      'vehicle_license',
      'vehicle_registration',
      'vehicle_inspection_certificate',
      'vehicle_possession_certificate',
      'vehicle_test_certificate',
      'vehicle_transfer_certificate',
      'certificate',
      'certificate_of_installation',
      'delivery_form',
      'insurance_policy',
      'insurance_policy_with_tax_invoice',
      'motor_insurance_policy',
      'motor_insurance_policy_schedule'
    ])
    and canonical_type is not null
), client_candidates as (
  select *
  from normalized
  where client_id is not null
    and canonical_type = any (array[
      'emirates_id',
      'passport',
      'visa',
      'driving_license',
      'id_card',
      'identity_card',
      'identity_document',
      'identity_documents',
      'identification',
      'identification_document',
      'identification_documents',
      'personal_identification',
      'company_license'
    ])
    and canonical_type is not null
), inserted_vehicle as (
  insert into public.vehicle_documents (
    vehicle_id,
    document_type,
    title,
    storage_path,
    mime_type,
    file_size,
    status,
    metadata,
    uploaded_at,
    uploaded_by
  )
  select
    v.vehicle_id,
    v.canonical_type,
    coalesce(v.title, initcap(replace(v.canonical_type, '_', ' '))),
    v.storage_path,
    null,
    null,
    case
      when v.status is null or btrim(v.status) = '' then 'uploaded'
      when lower(v.status) = 'ingested' then 'uploaded'
      else v.status
    end,
    jsonb_build_object(
      'migrated_from', 'deal_documents',
      'deal_document_id', v.id,
      'deal_id', v.deal_id,
      'original_document_type', v.document_type
    ),
    coalesce(v.signed_at, v.created_at, timezone('utc', now())),
    null
  from vehicle_candidates v
  where not exists (
    select 1
    from public.vehicle_documents vd
    where vd.vehicle_id = v.vehicle_id
      and vd.document_type = v.canonical_type
      and vd.storage_path = v.storage_path
  )
  returning id as deal_document_id
), inserted_client as (
  insert into public.client_documents (
    client_id,
    document_type,
    document_category,
    title,
    storage_path,
    mime_type,
    file_size,
    status,
    metadata,
    uploaded_at,
    uploaded_by,
    verified_at,
    verified_by
  )
  select
    c.client_id,
    c.canonical_type,
    case when c.canonical_type = 'company_license' then 'company' else 'identity' end,
    coalesce(c.title, initcap(replace(c.canonical_type, '_', ' '))),
    c.storage_path,
    null,
    null,
    case
      when c.status is null or btrim(c.status) = '' then 'uploaded'
      when lower(c.status) = 'ingested' then 'uploaded'
      else c.status
    end,
    jsonb_build_object(
      'migrated_from', 'deal_documents',
      'deal_document_id', c.id,
      'deal_id', c.deal_id,
      'original_document_type', c.document_type
    ),
    coalesce(c.signed_at, c.created_at, timezone('utc', now())),
    null,
    null,
    null
  from client_candidates c
  where not exists (
    select 1
    from public.client_documents cd
    where cd.client_id = c.client_id
      and cd.document_type = c.canonical_type
      and cd.storage_path = c.storage_path
  )
  returning id as deal_document_id
)
delete from public.deal_documents dd
where dd.id in (
    select id from vehicle_candidates
  )
  or dd.id in (
    select id from client_candidates
  );
