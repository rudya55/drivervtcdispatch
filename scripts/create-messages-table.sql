-- Create messages table for chat between fleet/dispatch and drivers
-- Execute this SQL in your Supabase SQL Editor

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  driver_id uuid references public.drivers(id) on delete cascade not null,
  sender_role text not null check (sender_role in ('driver', 'fleet', 'admin')),
  sender_user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  created_at timestamptz default now() not null,
  read_by_driver boolean default false,
  read_by_fleet boolean default false
);

-- Enable RLS
alter table public.messages enable row level security;

-- Create indexes
create index idx_messages_course_id on public.messages(course_id);
create index idx_messages_driver_id on public.messages(driver_id);
create index idx_messages_created_at on public.messages(created_at desc);

-- RLS policies for drivers
create policy "Drivers can view their own messages"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.drivers
      where drivers.id = messages.driver_id
        and drivers.user_id = auth.uid()
    )
  );

create policy "Drivers can insert their own messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_role = 'driver' and
    sender_user_id = auth.uid() and
    exists (
      select 1 from public.drivers
      where drivers.id = messages.driver_id
        and drivers.user_id = auth.uid()
    )
  );

-- RLS policies for admin/fleet (will be managed via security definer functions or similar)
create policy "Admins can view all messages"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('admin', 'fleet_manager')
    )
  );

create policy "Admins can insert messages"
  on public.messages
  for insert
  to authenticated
  with check (
    sender_role in ('fleet', 'admin') and
    sender_user_id = auth.uid() and
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('admin', 'fleet_manager')
    )
  );

-- Enable Realtime
alter publication supabase_realtime add table public.messages;
