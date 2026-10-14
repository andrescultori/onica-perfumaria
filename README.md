# Ônica Perfumaria — Formulário de Identidade Olfativa

Formulário público em etapas para clientes da Ônica + painel admin para a equipe analisar as respostas.

**Stack:** Vite + React + TypeScript · Supabase (Postgres + Auth + Edge Function) · Vercel · Resend (aviso por e-mail)

## Rotas
| Rota | Quem acessa | O que é |
|---|---|---|
| `/` | Público | Formulário em 6 etapas (dados, 4 seções do questionário, revisão + consentimento LGPD) |
| `/admin/login` | Equipe | Login e-mail/senha, com "Esqueci minha senha" |
| `/admin/redefinir-senha` | Equipe | Tela aberta pelo link do e-mail de redefinição |
| `/admin/senha` | Equipe (logada) | Alterar a própria senha |
| `/admin` | Equipe | Lista com busca, filtro por status, contadores e exportação CSV |
| `/admin/respostas/:id` | Equipe | Ficha completa, status, notas internas, imprimir/salvar PDF, links de WhatsApp/e-mail/Instagram |

## Como os dados ficam protegidos
- Tabelas `onica_*` no projeto Supabase compartilhado `AndreScultori`. **Ninguém lê as respostas pelo navegador sem estar na allowlist** `onica_admins` (RLS). Ter conta em outro app do mesmo projeto não dá acesso.
- O formulário público **não grava direto no banco**: envia para a Edge Function `onica-submit`, que valida, exige consentimento LGPD, tem honeypot anti-robô e grava com service role.
- O banco rejeita `lgpd_consent = false` (CHECK) e anônimos não têm policy de insert/select.

## Rodar localmente
```bash
cp .env.example .env.local   # preencha VITE_SUPABASE_ANON_KEY (chave publishable)
npm install
npm run dev
```

## Deploy (Vercel)
1. Importe o repositório na Vercel (framework: Vite — `vercel.json` já cuida do SPA).
2. Variáveis de ambiente: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. No Supabase → Authentication → URL Configuration, defina *Site URL* como a URL do deploy e adicione `https://SEU-DOMINIO/admin/redefinir-senha` em *Redirect URLs* (necessário para o "esqueci minha senha").

## Liberar membros da equipe
1. Supabase → Authentication → Users → **Add user** (e-mail + senha, marque *Auto Confirm*).
2. Rode no SQL Editor:
```sql
insert into public.onica_admins (user_id, email, nome)
select id, email, 'Kelly' from auth.users where email = 'email-da-kelly@exemplo.com';
```
Repita para cada pessoa (Kelly, Danielle, André). Para remover o acesso: `delete from public.onica_admins where email = '...';`

## Aviso por e-mail a cada resposta
A Edge Function `onica-submit` envia o aviso via Resend **se os secrets existirem** (sem eles, só grava). Em Supabase → Edge Functions → Secrets:

| Secret | Valor |
|---|---|
| `RESEND_API_KEY` | chave da conta Resend |
| `ONICA_NOTIFY_TO` | `kellymaldonadoartesa@gmail.com` (aceita vários separados por vírgula) |
| `ONICA_FROM_EMAIL` | ex.: `Ônica Perfumaria <avisos@seudominio.com.br>` — precisa de domínio verificado no Resend |
| `ONICA_ADMIN_URL` | URL do deploy, para o link "Abrir ficha completa" |

> Sem domínio verificado, o remetente de teste `onboarding@resend.dev` só entrega para o e-mail dono da conta Resend.

## Identidade visual
Paleta provisória extraída do logo, centralizada nas variáveis CSS em `src/styles.css` (`--gold`, `--olive`, `--cream`…) e fontes no `index.html`. Ao receber a identidade completa, basta trocar esses tokens e `public/logo-onica.png`.

## Questionário
Definido em um único arquivo: `src/lib/questions.ts` (formulário, ficha do admin, CSV e e-mail leem dele). As perguntas 3/16 originais (cores/paleta) foram unificadas e a 14 original virou pergunta aberta + pergunta de mensagem, totalizando 17 perguntas.
