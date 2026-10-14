import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Usada em dois fluxos:
//  - /admin/redefinir-senha: pessoa chegou pelo link do e-mail "Esqueci minha senha" (sessão de recuperação na URL)
//  - /admin/senha: pessoa já logada quer trocar a própria senha (dentro do painel)
export default function SetPassword({ mode }: { mode: "recovery" | "change" }) {
  const [ready, setReady] = useState<"wait" | "yes" | "no">("wait");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((ev, s) => {
      if (alive && (ev === "PASSWORD_RECOVERY" || (s && ev === "SIGNED_IN"))) setReady("yes");
    });
    supabase.auth.getSession().then(({ data }) => { if (alive && data.session) setReady("yes"); });
    // se o link for inválido/expirado, nenhuma sessão aparece
    const t = setTimeout(() => { if (alive) setReady((r) => (r === "wait" ? "no" : r)); }, 4000);
    return () => { alive = false; clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (pw.length < 8) return setErr("Use pelo menos 8 caracteres.");
    if (pw !== pw2) return setErr("As senhas não conferem.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setErr(/same|different/i.test(error.message) ? "A nova senha precisa ser diferente da atual." : "Não foi possível salvar a senha. Se o link expirou, peça um novo.");
      return;
    }
    setOk(true);
    setTimeout(() => nav("/admin"), 1500);
  }

  const body = (
    <form className="card narrow" onSubmit={onSubmit}>
      <h2 className="center">{mode === "recovery" ? "Definir nova senha" : "Alterar senha"}</h2>
      {ready === "wait" && <p className="muted center">Validando link…</p>}
      {ready === "no" && (
        <>
          <p className="error-text center">Link inválido ou expirado.</p>
          <p className="center"><Link to="/admin/login" className="link">Voltar ao login e pedir um novo link</Link></p>
        </>
      )}
      {ready === "yes" && !ok && (
        <>
          <label className="field"><span className="field-label">Nova senha</span>
            <input type="password" autoComplete="new-password" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} required />
          </label>
          <label className="field"><span className="field-label">Repita a nova senha</span>
            <input type="password" autoComplete="new-password" minLength={8} value={pw2} onChange={(e) => setPw2(e.target.value)} required />
          </label>
          {err && <p className="error-text" role="alert">{err}</p>}
          <button className="btn block" disabled={busy}>{busy ? "Salvando…" : "Salvar senha"}</button>
          {mode === "change" && <p className="center"><Link to="/admin" className="link">Cancelar</Link></p>}
        </>
      )}
      {ok && <p className="center" role="status">Senha atualizada! Redirecionando…</p>}
    </form>
  );

  return mode === "recovery" ? <div className="center-screen">{body}</div> : <div className="center-inner">{body}</div>;
}
