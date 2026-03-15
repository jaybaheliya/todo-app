-- Run this in your Supabase SQL editor

create table if not exists projects (
  id         bigint primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  name       text not null,
  color      text not null default '#a78bfa',
  parent_id  bigint references projects(id) on delete cascade,
  collapsed  boolean not null default false,
  created_at timestamptz default now()
);

alter table projects enable row level security;

create policy "Users manage own projects"
  on projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Add project_id to todos if it doesn't exist
alter table todos add column if not exists project_id bigint references projects(id) on delete set null;

-- Add emoji to todos
alter table todos add column if not exists emoji text;
