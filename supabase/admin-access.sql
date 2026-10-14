-- Libera (ou remove) acesso ao painel da Ônica. Rode no SQL Editor do Supabase.
-- Pré-requisito: a pessoa já existe em Authentication > Users (pode ser um usuário
-- de outro app do mesmo projeto; o acesso ao painel só vale para quem estiver nesta lista).

-- 1) Liberar (ajuste e-mails/nomes e repita a linha para cada pessoa)
insert into public.onica_admins (user_id, email, nome)
select id, email, nome
from (values
  ('EMAIL-DA-KELLY@exemplo.com',    'Kelly'),
  ('EMAIL-DA-DANIELLE@exemplo.com', 'Danielle'),
  ('amscultori@gmail.com',          'André')
) as v(email_lista, nome)
join auth.users u on lower(u.email) = lower(v.email_lista)
on conflict (user_id) do nothing;

-- 2) Conferir quem tem acesso
select email, nome, created_at from public.onica_admins order by created_at;

-- 3) Remover acesso de alguém
-- delete from public.onica_admins where lower(email) = lower('EMAIL@exemplo.com');
