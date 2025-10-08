-- Stage 3 • Migration 5: finance layer

create type public.invoice_type as enum (
  'monthly_payment',
  'down_payment',
  'processing_fee',
  'late_fee',
  'insurance',
  'buyout'
);

create type public.invoice_status as enum (
  'draft',
  'pending',
  'overdue',
  'paid',
  'cancelled'
);

create type public.payment_status as enum (
  'initiated',
  'processing',
  'succeeded',
  'failed',
  'refunded'
);

create type public.payment_method as enum (
  'card',
  'bank_transfer',
  'cash',
  'cheque',
  'wallet'
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique,
  deal_id uuid not null references public.deals(id) on delete cascade,
  invoice_type public.invoice_type not null,
  amount numeric(16,2) not null,
  tax_amount numeric(16,2) default 0,
  total_amount numeric(16,2) not null,
  currency text not null default 'AED',
  due_date date not null,
  issue_date date not null default current_date,
  status public.invoice_status not null default 'pending',
  line_items jsonb default '[]'::jsonb,
  tax_breakdown jsonb default '[]'::jsonb,
  payment_terms text,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_invoices_set_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

create index if not exists idx_invoices_deal on public.invoices (deal_id);
create index if not exists idx_invoices_status on public.invoices (status);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete set null,
  amount numeric(16,2) not null,
  currency text not null default 'AED',
  status public.payment_status not null default 'initiated',
  method public.payment_method,
  received_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger trg_payments_set_updated_at
before update on public.payments
for each row
execute function public.set_updated_at();

create index if not exists idx_payments_deal on public.payments (deal_id);
create index if not exists idx_payments_invoice on public.payments (invoice_id);
create index if not exists idx_payments_status on public.payments (status);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider text,
  transaction_reference text unique,
  amount numeric(16,2),
  currency text not null default 'AED',
  status public.payment_status not null default 'initiated',
  payload jsonb default '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payment_transactions_payment on public.payment_transactions (payment_id);
create index if not exists idx_payment_transactions_status on public.payment_transactions (status);

create table if not exists public.payment_schedules (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  sequence integer not null,
  due_date date not null,
  amount numeric(16,2) not null,
  status public.invoice_status not null default 'pending',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (deal_id, sequence)
);

create trigger trg_payment_schedules_set_updated_at
before update on public.payment_schedules
for each row
execute function public.set_updated_at();

create index if not exists idx_payment_schedules_deal on public.payment_schedules (deal_id);
