import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { QUESTIONS, SECTIONS, STATUS_LABEL, answerText, questionNumber } from "../lib/questions";
import { fmtDate, waLink, type Submission } from "../lib/export";

interface Note { id: string; body: string; author_email: string | null; author_id: string | null; created_at: string }

export default function SubmissionDetail() {
  const { id } = useParams();
  const [sub, setSub] = useState<Submission | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [me, setMe] = useState<{ id: string; email: string } | null>(null);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: s, error }, { data: n }, { data: u }] = await Promise.all([
      supabase.from("onica_submissions").select("*").eq("id", id!).maybeSingle(),
      supabase.from("onica_notes").select("id,body,author_email,author_id,created_at").eq("submission_id", id!).order("created_at"),
      supabase.auth.getUser(),
    ]);
    if (error || !s) setErr("Resposta não encontrada."); else setSub(s as Submission);
    setNotes((n ?? []) as Note[]);
    if (u.user) setMe({ id: u.user.id, email: u.user.email ?? "" });
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(status: Submission["status"]) {
    if (!sub) return;
    const prev = sub.status;
    setSub({ ...sub, status });
    const { error } = await supabase.from("onica_submissions").update({ status }).eq("id", sub.id);
    if (error) { setSub({ ...sub, status: prev }); setErr("Não foi possível atualizar o status."); }
  }

  async function addNote() {
    const body = draft.trim();
    if (!body || !me || !sub) return;
    const { error } = await supabase.from("onica_notes").insert({ submission_id: sub.id, body, author_id: me.id, author_email: me.email });
    if (error) { setErr("Não foi possível salvar a nota."); return; }
    setDraft(""); load();
  }

  async function delNote(noteId: string) {
    await supabase.from("onica_notes").delete().eq("id", noteId);
    setNotes((n) => n.filter((x) => x.id !== noteId));
  }

  if (loading) return <p className="muted">Carregando…</p>;
  if (!sub) return <div><Link to="/admin" className="link">← Voltar</Link><p className="error-text">{err || "Não encontrada."}</p></div>;

  return (
    <article className="ficha">
      <div className="no-print ficha-top">
        <Link to="/admin" className="link">← Todas as respostas</Link>
        <button className="btn ghost sm" onClick={() => window.print()}>Imprimir / salvar PDF</button>
      </div>

      <header className="ficha-head">
        <img className="print-only" src="/logo-onica.png" alt="Ônica" height={56} />
        <h1>{sub.nome}</h1>
        <p className="muted">Respondido em {fmtDate(sub.created_at)} · consentimento LGPD em {fmtDate(sub.lgpd_consent_at)}</p>
        <div className="contact">
          <a href={waLink(sub.whatsapp)} target="_blank" rel="noreferrer">WhatsApp: {sub.whatsapp}</a>
          <a href={`mailto:${sub.email}`}>{sub.email}</a>
          {sub.instagram && <a href={`https://instagram.com/${sub.instagram}`} target="_blank" rel="noreferrer">@{sub.instagram}</a>}
        </div>
        <label className="status no-print">
          <span className="field-label">Status</span>
          <select value={sub.status} onChange={(e) => setStatus(e.target.value as Submission["status"])}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <p className="print-only">Status: {STATUS_LABEL[sub.status]}</p>
      </header>

      {err && <p className="error-text" role="alert">{err}</p>}

      {[1, 2, 3, 4].map((s) => (
        <section key={s} className="ficha-sec">
          <h3>{SECTIONS[s].title}</h3>
          {QUESTIONS.filter((q) => q.section === s).map((q) => (
            <div key={q.id} className="qa">
              <p className="qa-q">{questionNumber(q.id)}. {q.label}</p>
              <p className="qa-a">{answerText(q, sub.answers) || <em className="muted">Sem resposta</em>}</p>
            </div>
          ))}
        </section>
      ))}

      <section className="ficha-sec no-print">
        <h3>Notas internas</h3>
        {notes.length === 0 && <p className="muted">Nenhuma nota ainda.</p>}
        {notes.map((n) => (
          <div key={n.id} className="note">
            <p>{n.body}</p>
            <span className="muted">{n.author_email ?? "equipe"} · {fmtDate(n.created_at)}
              {me?.id === n.author_id && <button className="link danger" onClick={() => delNote(n.id)}>excluir</button>}
            </span>
          </div>
        ))}
        <textarea rows={3} placeholder="Anotações da equipe (ex.: famílias olfativas sugeridas, próximos passos)…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <button className="btn sm" onClick={addNote} disabled={!draft.trim()}>Adicionar nota</button>
      </section>
    </article>
  );
}
