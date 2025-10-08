# Stage 3 — Supabase Data Model Plan

## Scope For Initial Migrations

The roadmap requires parity with the `/beta` prototype while keeping the model modular. We will iterate in the following slices:

1. **Identity & Access**
   - `auth.users` (managed by Supabase) enriched via:
     - `profiles`
     - `user_roles`
   - Supporting tables later: `user_sessions`, `audit_logs` (not in initial migration).

2. **Core Leasing Domain**
   - `vehicles`
   - `vehicle_images`
   - `vehicle_specifications`
   - `applications`
   - `application_documents`
   - `deals`
   - `deal_events` (audit of status changes, optional in slice 1)

3. **Finance**
   - `invoices`
   - `payments` (aggregates)
   - `payment_transactions` (provider level)
   - `payment_schedules`

4. **Investor Layer** (deferred to a second wave once dashboards are active)
   - `investors`
   - `investment_portfolios`
   - `portfolio_assets`

## Field Mapping Highlights

| Table | Key Fields | Notes |
| ----- | ---------- | ----- |
| `profiles` | `id`, `user_id`, `status`, `full_name`, `phone`, `emirates_id`, `timezone`, `avatar_url`, `marketing_opt_in`, `metadata` | Mirrors KYC data referenced throughout `/beta`. |
| `user_roles` | `id`, `user_id`, `role`, `assigned_at`, `assigned_by`, `metadata` | Supports multi-role users (client, ops, admin, investor). |
| `vehicles` | `id`, `vin`, `make`, `model`, `year`, `body_type`, `fuel_type`, `transmission`, `mileage`, `purchase_price`, `monthly_lease_rate`, `status`, `features`, `location`, timestamps | Derived from vehicle cards (`/beta/index.html`, `/beta/cars/*`). |
| `vehicle_images` | `id`, `vehicle_id`, `storage_path`, `label`, `is_primary`, `sort_order` | Supabase Storage integration. |
| `vehicle_specifications` | `id`, `vehicle_id`, `category`, `spec_key`, `spec_value`, `unit`, `sort_order` | Covers “Specifications” blocks. |
| `applications` | `id`, `application_number`, `user_id`, `vehicle_id`, `status`, `requested_amount`, `term_months`, `down_payment`, `monthly_payment`, `personal_info`, `financial_info`, `employment_info`, `scoring_results`, `assigned_to`, timestamps | Aligns with `/beta/application/new` multi-step flow. |
| `application_documents` | `id`, `application_id`, `document_type`, `original_filename`, `storage_path`, `status`, `verification_data`, timestamps | Upload references for Supabase Storage. |
| `deals` | `id`, `deal_number`, `application_id`, `vehicle_id`, `client_id`, `status`, `principal_amount`, `total_amount`, `monthly_payment`, `term_months`, `interest_rate`, `contract_terms`, `insurance_details`, `assigned_account_manager`, `activated_at`, `completed_at`, timestamps | Drives `/beta/client/dashboard`, `/beta/ops/deals`. |
| `invoices` | `id`, `invoice_number`, `deal_id`, `invoice_type`, `amount`, `tax_amount`, `total_amount`, `currency`, `due_date`, `issue_date`, `status`, `line_items`, `payment_terms`, `paid_at`, timestamps | Table views in `/beta/client/invoices`. |
| `payments` | `id`, `deal_id`, `invoice_id`, `amount`, `currency`, `status`, `received_at`, `method`, `metadata`, timestamps | Aggregated perspective for dashboards. |
| `payment_transactions` | `id`, `payment_id`, `provider`, `transaction_reference`, `status`, `payload`, timestamps | Detailed provider callbacks. |
| `payment_schedules` | `id`, `deal_id`, `sequence`, `due_date`, `amount`, `status`, `metadata`, timestamps | For upcoming invoices and Ops planning. |

## Migration Strategy

1. `2024100701_init_identity.sql`
   - `profiles`
   - `user_roles`
   - helper enums (`user_role_enum`, `user_status_enum`)

2. `2024100702_core_vehicle.sql`
   - `vehicles`
   - `vehicle_images`
   - `vehicle_specifications`
   - relevant enum types (`vehicle_status_enum`, `fuel_type_enum`, etc.)

3. `2024100703_applications.sql`
   - `applications`
   - `application_documents`
   - `application_status_enum`

4. `2024100704_deals.sql`
   - `deals`
   - `deal_status_enum`
   - optional `deal_events`

5. `2024100705_finance.sql`
   - `invoices`
   - `payments`
   - `payment_transactions`
   - `payment_schedules`
   - enums for invoice/payment status & type

## Seed Data (supabase/seed.sql)

- Vehicles & pricing: extracted from `/beta/assets/pricing.json` and `/beta/index.html`.
- Sample users/roles: admin, client, ops, investor.
- Applications & deals: aligned with `/beta/client/dashboard` metrics.
- Finance items: 1–2 invoices & payments per deal for `/beta/client/invoices`.

## RLS & Edge Functions (Outline)

- **RLS**
  - clients: access their own `profiles`, `applications`, `deals`, `invoices`, `payments`.
  - ops/admin: role-based read/write using `auth.uid()` + `user_roles`.
  - investors: restricted to portfolios (deferred until Stage 8).

- **Edge Functions** (placeholders to add after schema stabilises)
  - `scoring-application`: invoked on application submission → updates `applications.scoring_results`.
  - `compute-payment-schedule`: generates `payment_schedules` after a deal is activated.
  - `notify-status-change`: pushes events to external providers (SMS/email).
