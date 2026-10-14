import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { STATUS_LABEL, answerText, QUESTIONS } from "../lib/questions";
import { downloadCsv, fmtDate, type Submission } from "../lib/export";

export default function SubmissionsList() {
  const [rows, setRows] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [order, setOrder] = useState<"desc" | "asc">("desc");

  useEffect(() => {
    supabase.from("onica_submissions")
      .select("id,created_at,status,nome,whatsapp,email,instagram,lgpd_consent_at,answers")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr("Não foi possível carregar as respostas."); else setRows((data ?? []) as Submission[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const list = rows.filter((r) => {
      if (status !== "todos" && r.status !== status) return false;
      if (!t) return true;
      const hay = [r.nome, r.email, r.whatsapp, r.instagram ?? "", answerText(QUESTIONS[0], r.answers)].join(" ").toLowerCase();
      return hay.includes(t);
    });
    return order === "desc" ? list : [...list].reverse();
  }, [rows, q, status, order]);

  const counts = useMemo(() => ({
    total: rows.length,
    novo: rows.filter((r) => r.status === "novo").length,
    em_analise: rows.filter((r) => r.status === "em_analise").length,
    concluido: rows.filter((r) => r.status === "concluido").length,
  }), [rows]);

  return (
    <div>
      <div className="stats">
        <Stat label="Total" n={counts.total} />
        <Stat label="Novas" n={counts.novo} accent />
        <Stat label="Em análise" n={counts.em_analise} />
        <Stat label="Concluídas" n={counts.concluido} />
      </div>

      <div className="toolbar">
        <input className="search" placeholder="Buscar por nome, e-mail, WhatsApp, clínica…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status">
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={order} onChange={(e) => setOrder(e.target.value as "asc" | "desc")} aria-label="Ordenar">
          <option value="desc">Mais recentes</option>
          <option value="asc">Mais antigas</option>
        </select>
        <button className="btn sm" disabled={!filtered.length} onClick={() => downloadCsv(filtered)}>Exportar CSV ({filtered.length})</button>
      </div>

      {loading && <p className="muted">Carregando…</p>}
      {err && <p className="error-text">{err}</p>}
      {!loading && !err && filtered.length === 0 && <p className="muted empty">Nenhuma resposta encontrada.</p>}

      <div className="list">
        {filtered.map((r) => (
          <Link key={r.id} to={`/admin/respostas/${r.id}`} className="row">
            <div className="row-main">
              <strong>{r.nome}</strong>
              <span className="muted clinic">{answerText(QUESTIONS[0], r.answers) || "—"}</span>
            </div>
            <div className="row-meta">
              <span className="muted">{r.whatsapp}</span>
              <span className="muted">{fmtDate(r.created_at)}</span>
              <span className={`pill ${r.status}`}>{STATUS_LABEL[r.status]}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, n, accent }: { label: string; n: number; accent?: boolean }) {
  return <div className={`stat ${accent ? "accent" : ""}`}><span className="stat-n">{n}</span><span className="stat-l">{label}</span></div>;
}
