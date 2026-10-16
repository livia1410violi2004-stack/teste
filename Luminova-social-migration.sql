-- LUMINOVA: migração complementar para personalização, materiais e permissões.
-- Execute no SQL Editor do Supabase após o schema principal Luminova.sql.
create extension if not exists pgcrypto;

alter table public.profiles add column if not exists cover_url text;
alter table public.profiles add column if not exists profile_settings jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists role text not null default 'learner';
alter table public.communities add column if not exists settings jsonb not null default '{}'::jsonb;
alter table public.communities add column if not exists welcome_text text not null default '';
alter table public.communities add column if not exists updated_at timestamptz not null default now();

-- Evita que um usuário se promova a admin/mentor alterando o próprio perfil.
create or replace function public.prevent_self_role_escalation()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null then
    if tg_op = 'INSERT' and new.role is distinct from 'learner' then
      raise exception 'O papel inicial deve ser learner; somente um administrador pode promover a conta.';
    elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
      raise exception 'A alteração de papel deve ser feita por um administrador confiável.';
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation before insert or update on public.profiles
for each row execute function public.prevent_self_role_escalation();

create table if not exists public.community_resources (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '',
  resource_type text not null check (resource_type in ('video','image','document','link','text')),
  file_url text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_resources_order_idx on public.community_resources(community_id, position, created_at desc);
alter table public.community_resources enable row level security;

create or replace function public.can_manage_community(target_community uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.communities c
    where c.id = target_community and c.owner_id = auth.uid()
  ) or exists (
    select 1 from public.community_members m
    where m.community_id = target_community and m.user_id = auth.uid()
      and m.status = 'active' and m.role in ('owner','moderator')
  ) or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  );
$$;

create or replace function public.can_teach_in_community(target_community uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_community(target_community) or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'mentor'
  );
$$;

drop policy if exists community_resources_read on public.community_resources;
create policy community_resources_read on public.community_resources for select to anon, authenticated
using (exists (select 1 from public.communities c where c.id = community_id and
  (c.visibility = 'public' or c.owner_id = auth.uid() or exists(select 1 from public.community_members m where m.community_id=c.id and m.user_id=auth.uid() and m.status='active'))));
drop policy if exists community_resources_insert_teacher on public.community_resources;
create policy community_resources_insert_teacher on public.community_resources for insert to authenticated
with check (author_id = auth.uid() and public.can_teach_in_community(community_id));
drop policy if exists community_resources_update_teacher on public.community_resources;
create policy community_resources_update_teacher on public.community_resources for update to authenticated
using (public.can_teach_in_community(community_id)) with check (public.can_teach_in_community(community_id));
drop policy if exists community_resources_delete_teacher on public.community_resources;
create policy community_resources_delete_teacher on public.community_resources for delete to authenticated
using (public.can_teach_in_community(community_id));

-- Storage: arquivos são públicos para leitura; upload exige sessão e pasta iniciada pelo ID do usuário.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community-media','community-media',true,104857600,
  array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','text/plain'])
on conflict (id) do update set public = true, file_size_limit = 104857600;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media','profile-media',true,5242880,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

drop policy if exists luminova_community_media_public_read on storage.objects;
create policy luminova_community_media_public_read on storage.objects for select to anon, authenticated using (bucket_id in ('community-media','profile-media'));
drop policy if exists luminova_community_media_upload_own_folder on storage.objects;
create policy luminova_community_media_upload_own_folder on storage.objects for insert to authenticated
with check (bucket_id in ('community-media','profile-media') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists luminova_community_media_update_own_folder on storage.objects;
create policy luminova_community_media_update_own_folder on storage.objects for update to authenticated
using (bucket_id in ('community-media','profile-media') and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id in ('community-media','profile-media') and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists luminova_community_media_delete_own_folder on storage.objects;
create policy luminova_community_media_delete_own_folder on storage.objects for delete to authenticated
using (bucket_id in ('community-media','profile-media') and (storage.foldername(name))[1] = auth.uid()::text);

-- Campos de configuração não sensíveis; jamais armazene senhas privadas em JSON/localStorage.
comment on column public.communities.settings is 'Personalização visual da comunidade (tema, cor, layout).';
comment on column public.profiles.profile_settings is 'Preferências visuais e layout do perfil do usuário.';
