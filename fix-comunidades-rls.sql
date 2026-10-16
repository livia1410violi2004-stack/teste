-- LumiNova: correção da recursão nas políticas RLS de comunidades
-- Execute no SQL Editor do Supabase no projeto usado pelo frontend.
-- Comunidades públicas podem ser listadas sem login; proprietários podem ver as próprias.
drop policy if exists communities_read on public.communities;
create policy communities_read
on public.communities
for select
to anon, authenticated
using (visibility = 'public' or owner_id = (select auth.uid()));

-- A política community_members_read existente pode consultar communities.
-- Como communities_read não consulta mais community_members, a recursão é interrompida.
