-- Ônica Perfumaria: formulário de identidade olfativa + admin
-- Projeto Supabase compartilhado: tudo prefixado com onica_

create table public.onica_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text,
  created_at timestamptz not null default now()
);
comment on table public.onica_admins is 'Allowlist da equipe da Ônica com acesso ao painel admin.';

create or replace function public.onica_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.onica_admins a where a.user_id = auth.uid());
$$;
revoke all on function public.onica_is_admin() from public, anon;
grant execute on function public.onica_is_admin() to authenticated;

create table public.onica_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'novo' check (status in ('novo','em_analise','concluido')),
  nome text not null,
  whatsapp text not null,
  email text not null,
  instagram text,
  lgpd_consent boolean not null check (lgpd_consent is true),
  lgpd_consent_at timestamptz not null default now(),
  answers jsonb not null default '{}'::jsonb
);
comment on table public.onica_submissions is 'Respostas do formulário (inseridas só pela edge function onica-submit).';
create index onica_submissions_created_idx on public.onica_submissions (created_at desc);
create index onica_submissions_status_idx on public.onica_submissions (status);

create table public.onica_notes (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.onica_submissions(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  author_email text,
  body text not null check (length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);
create index onica_notes_submission_idx on public.onica_notes (submission_id, created_at);

create or replace function public.onica_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;
create trigger onica_submissions_touch before update on public.onica_submissions
for each row execute function public.onica_touch_updated_at();

alter table public.onica_admins enable row level security;
alter table public.onica_submissions enable row level security;
alter table public.onica_notes enable row level security;

create policy onica_admins_self_read on public.onica_admins
  for select to authenticated using (user_id = auth.uid());

create policy onica_submissions_admin_select on public.onica_submissions
  for select to authenticated using (public.onica_is_admin());
create policy onica_submissions_admin_update on public.onica_submissions
  for update to authenticated using (public.onica_is_admin()) with check (public.onica_is_admin());

create policy onica_notes_admin_select on public.onica_notes
  for select to authenticated using (public.onica_is_admin());
create policy onica_notes_admin_insert on public.onica_notes
  for insert to authenticated with check (public.onica_is_admin() and author_id = auth.uid());
create policy onica_notes_admin_delete on public.onica_notes
  for delete to authenticated using (public.onica_is_admin() and author_id = auth.uid());
