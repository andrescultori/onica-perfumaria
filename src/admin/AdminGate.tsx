import { useEffect, useState } from "react";
import { Link, Navigate, Outlet, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

type State = "loading" | "anon" | "denied" | "ok";

export default function AdminGate() {
  const [state, setState] = useState<State>("loading");
  const [email, setEmail] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    let alive = true;
    async function check() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) { if (alive) setState("anon"); return; }
      // RLS: o usuário só enxerga a própria linha na allowlist
      const { data: row } = await supabase.from("onica_admins").select("user_id").eq("user_id", user.id).maybeSingle();
      if (!alive) return;
      setEmail(user.email ?? "");
      setState(row ? "ok" : "denied");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") setState("anon"); });
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, []);

  if (state === "loading") return <div className="center-screen muted">Carregando…</div>;
  if (state === "anon") return <Navigate to="/admin/login" replace />;
  if (state === "denied") {
    return (
      <div className="center-screen">
        <div className="card center narrow">
          <h2>Sem acesso</h2>
          <p className="muted">A conta {email} não está autorizada no painel da Ônica. Peça à equipe para liberar seu acesso.</p>
          <button className="btn" onClick={async () => { await supabase.auth.signOut(); nav("/admin/login"); }}>Sair</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <header className="admin-bar no-print">
        <Link to="/admin" className="admin-brand"><img src="/logo-onica.png" alt="Ônica" height={40} /><span>Painel · Identidade Olfativa</span></Link>
        <div className="admin-user">
          <span className="muted">{email}</span>
          <Link to="/admin/senha" className="link">Alterar senha</Link>
          <button className="btn ghost sm" onClick={async () => { await supabase.auth.signOut(); nav("/admin/login"); }}>Sair</button>
        </div>
      </header>
      <div className="admin-body"><Outlet /></div>
    </div>
  );
}
