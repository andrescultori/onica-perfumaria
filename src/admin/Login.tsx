import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { setErr("E-mail ou senha incorretos."); return; }
    nav("/admin");
  }

  async function forgot() {
    if (!email.trim()) { setErr("Digite seu e-mail acima para receber o link de redefinição."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/redefinir-senha` });
    setErr(error ? "Não foi possível enviar o link agora." : "Se o e-mail existir, enviamos um link para redefinir a senha.");
  }

  return (
    <div className="center-screen">
      <form className="card narrow" onSubmit={onSubmit}>
        <img className="login-logo" src="/logo-onica.png" alt="Ônica" width={160} />
        <h2 className="center">Área da equipe</h2>
        <label className="field"><span className="field-label">E-mail</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field"><span className="field-label">Senha</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {err && <p className="error-text" role="alert">{err}</p>}
        <button className="btn block" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
        <button type="button" className="link" onClick={forgot}>Esqueci minha senha</button>
      </form>
    </div>
  );
}
