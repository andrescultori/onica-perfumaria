import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Função pública (verify_jwt desligado de propósito: o formulário é aberto a clientes).
// Proteções: validação de campos, limite de tamanho, honeypot e consentimento LGPD obrigatório.
// Deploy: supabase functions deploy onica-submit --no-verify-jwt

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let payload: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 40_000) return json({ error: "payload_too_large" }, 413);
    payload = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  // Honeypot: robôs preenchem; fingimos sucesso sem gravar.
  if (str(payload.website, 200)) return json({ ok: true });

  const nome = str(payload.nome, 150);
  const whatsapp = str(payload.whatsapp, 30);
  const email = str(payload.email, 200).toLowerCase();
  const instagram = str(payload.instagram, 100) || null;
  const lgpd = payload.lgpd_consent === true;
  const answers = payload.answers && typeof payload.answers === "object" && !Array.isArray(payload.answers)
    ? (payload.answers as Record<string, unknown>)
    : {};

  const errors: string[] = [];
  if (nome.length < 2) errors.push("nome");
  if (whatsapp.replace(/\D/g, "").length < 10) errors.push("whatsapp");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("email");
  if (!lgpd) errors.push("lgpd_consent");
  if (errors.length) return json({ error: "validation", fields: errors }, 422);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await supabase
    .from("onica_submissions")
    .insert({ nome, whatsapp, email, instagram, lgpd_consent: true, answers })
    .select("id")
    .single();

  if (error) {
    console.error("insert_failed", error.message);
    return json({ error: "save_failed" }, 500);
  }

  // Aviso por e-mail (opcional: só envia se RESEND_API_KEY estiver configurada).
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const notifyTo = Deno.env.get("ONICA_NOTIFY_TO") ?? "kellymaldonadoartesa@gmail.com";
  const from = Deno.env.get("ONICA_FROM_EMAIL") ?? "Ônica Perfumaria <onboarding@resend.dev>";
  const adminUrl = Deno.env.get("ONICA_ADMIN_URL") ?? "";

  if (resendKey) {
    try {
      const link = adminUrl ? `${adminUrl.replace(/\/$/, "")}/admin/respostas/${data.id}` : "";
      const negocio = esc((answers as Record<string, unknown>).q1 ?? "");
      const html = `
        <div style="font-family:Arial,sans-serif;color:#3b3a2a">
          <h2 style="color:#b8923a;margin:0 0 8px">Nova resposta — Identidade Olfativa</h2>
          <p><b>${esc(nome)}</b><br>WhatsApp: ${esc(whatsapp)}<br>E-mail: ${esc(email)}${instagram ? `<br>Instagram: ${esc(instagram)}` : ""}</p>
          ${negocio ? `<p><b>Profissão / negócio:</b> ${negocio}</p>` : ""}
          ${link ? `<p><a href="${esc(link)}">Abrir ficha completa no painel</a></p>` : ""}
        </div>`;
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: notifyTo.split(",").map((s) => s.trim()).filter(Boolean),
          reply_to: email,
          subject: `Nova identidade olfativa: ${nome}`,
          html,
        }),
      });
      if (!r.ok) console.error("resend_failed", r.status, await r.text());
    } catch (e) {
      console.error("resend_error", String(e));
    }
  }

  return json({ ok: true, id: data.id });
});
