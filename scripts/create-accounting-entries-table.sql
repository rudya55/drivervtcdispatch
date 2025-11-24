-- Create accounting_entries table for automatic accounting system
-- This table stores financial records for completed courses

create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  driver_id uuid references public.drivers(id) on delete cascade not null,
  driver_amount numeric(10,2) not null,
  fleet_amount numeric(10,2) not null,
  total_amount numeric(10,2) not null,
  rating integer check (rating >= 1 and rating <= 5),
  comment text,
  payment_status text default 'pending' check (payment_status in ('pending', 'paid', 'cancelled')),
  created_at timestamptz default now() not null
);

-- Enable RLS
alter table public.accounting_entries enable row level security;

-- Create indexes for performance
create index idx_accounting_entries_course_id on public.accounting_entries(course_id);
create index idx_accounting_entries_driver_id on public.accounting_entries(driver_id);
create index idx_accounting_entries_created_at on public.accounting_entries(created_at desc);
create index idx_accounting_entries_payment_status on public.accounting_entries(payment_status);

-- RLS policy: Drivers can view their own accounting entries
create policy "Drivers can view their own accounting"
  on public.accounting_entries
  for select
  to authenticated
  using (
    exists (
      select 1 from public.drivers
      where drivers.id = accounting_entries.driver_id
        and drivers.user_id = auth.uid()
    )
  );

-- RLS policy: Admins and fleet managers can view all accounting entries
create policy "Admins can view all accounting"
  on public.accounting_entries
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('admin', 'fleet_manager')
    )
  );

-- RLS policy: Only admins can modify accounting entries
create policy "Admins can update accounting"
  on public.accounting_entries
  for update
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

-- Grant permissions
grant select on public.accounting_entries to authenticated;
grant update on public.accounting_entries to authenticated;
