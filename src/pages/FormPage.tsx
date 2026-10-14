import { useEffect, useMemo, useRef, useState } from "react";
import { ANON_KEY, SUBMIT_URL } from "../lib/supabase";
import { QUESTIONS, SECTIONS, otherMarker, questionNumber, type Answers, type Question } from "../lib/questions";

const DRAFT_KEY = "onica-identidade-olfativa-draft-v1";
const LAST_STEP = SECTIONS.length; // 0..4 seções; 5 = revisão + consentimento

interface Contact { nome: string; whatsapp: string; email: string; instagram: string }

function loadDraft(): { contact: Contact; answers: Answers } | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function FormPage() {
  const draft = useMemo(loadDraft, []);
  const [step, setStep] = useState(0);
  const [contact, setContact] = useState<Contact>(draft?.contact ?? { nome: "", whatsapp: "", email: "", instagram: "" });
  const [answers, setAnswers] = useState<Answers>(draft?.answers ?? {});
  const [lgpd, setLgpd] = useState(false);
  const [honey, setHoney] = useState("");
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [done, setDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ contact, answers })); } catch { /* sem storage */ }
  }, [contact, answers]);

  useEffect(() => { topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [step, done]);

  const set = (id: string, v: string | string[]) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setErrors((e) => { if (!e.has(id)) return e; const n = new Set(e); n.delete(id); return n; });
  };

  const sectionQs = (s: number) => QUESTIONS.filter((q) => q.section === s);

  function missingIn(stepIdx: number): string[] {
    const miss: string[] = [];
    if (stepIdx === 0) {
      if (contact.nome.trim().length < 2) miss.push("nome");
      if (contact.whatsapp.replace(/\D/g, "").length < 10) miss.push("whatsapp");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) miss.push("email");
      return miss;
    }
    if (stepIdx >= 1 && stepIdx <= 4) {
      for (const q of sectionQs(stepIdx)) {
        if (!q.required) continue;
        const v = answers[q.id];
        const ok = q.type === "triple"
          ? Array.isArray(v) && v.some((x) => x.trim())
          : Array.isArray(v) ? v.length > 0 : typeof v === "string" && v.trim().length > 0;
        if (!ok) miss.push(q.id);
      }
    }
    return miss;
  }

  function next() {
    const miss = missingIn(step);
    if (miss.length) { setErrors(new Set(miss)); return; }
    setErrors(new Set());
    setStep((s) => Math.min(s + 1, LAST_STEP));
  }

  async function submit() {
    if (!lgpd) { setErrors(new Set(["lgpd"])); return; }
    setSending(true); setSendError("");
    try {
      const res = await fetch(SUBMIT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON_KEY },
        body: JSON.stringify({
          nome: contact.nome, whatsapp: contact.whatsapp, email: contact.email,
          instagram: contact.instagram.replace(/^@/, ""),
          lgpd_consent: true, website: honey, answers,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      try { localStorage.removeItem(DRAFT_KEY); } catch { /* ok */ }
      setDone(true);
    } catch {
      setSendError("Não conseguimos enviar agora. Suas respostas continuam salvas neste aparelho — tente novamente em instantes.");
    } finally { setSending(false); }
  }

  if (done) {
    return (
      <main className="shell" ref={topRef}>
        <Header />
        <section className="card center">
          <div className="seal" aria-hidden>✓</div>
          <h2>Muito obrigada por compartilhar suas preferências!</h2>
          <p className="lead">
            Com essas informações, poderemos selecionar as famílias olfativas mais adequadas e desenvolver
            combinações que representem você e sua clínica.
          </p>
          <p className="muted">
            Nosso objetivo é criar mais do que um aroma agradável: queremos construir uma identidade olfativa
            que transmita cuidado, personalidade e uma experiência memorável. Em breve a equipe da Ônica entrará em contato.
          </p>
        </section>
      </main>
    );
  }

  const progress = Math.round((step / LAST_STEP) * 100);
  const meta = step <= 4 ? SECTIONS[step] : { title: "Quase lá!", subtitle: "Revise e envie suas respostas" };

  return (
    <main className="shell">
      <div ref={topRef} />
      <Header compact={step > 0} />
      {step === 0 && (
        <section className="intro">
          <h1>Formulário de Identidade Olfativa</h1>
          <p className="tagline">Uma fragrância exclusiva para você e sua clínica</p>
          <p>
            Olá! Seja bem-vinda a esta experiência sensorial. Este questionário vai nos ajudar a conhecer seus gostos,
            sua personalidade e a atmosfera que você deseja transmitir na sua clínica. Com suas respostas, poderemos
            desenvolver uma identidade olfativa que represente sua essência e torne a experiência dos pacientes ainda mais especial.
          </p>
          <p className="muted">Não existem respostas certas ou erradas. Responda com sinceridade!</p>
        </section>
      )}

      <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso">
        <div className="progress-bar" style={{ width: `${Math.max(progress, 4)}%` }} />
      </div>
      <p className="step-count">Etapa {step + 1} de {LAST_STEP + 1}</p>

      <section className="card">
        <h2>{meta.title}</h2>
        <p className="muted sub">{meta.subtitle}</p>

        {step === 0 && (
          <div className="fields">
            <Field label="Seu nome" error={errors.has("nome")} msg="Informe seu nome">
              <input value={contact.nome} autoComplete="name" onChange={(e) => { setContact({ ...contact, nome: e.target.value }); setErrors((x) => { const n = new Set(x); n.delete("nome"); return n; }); }} />
            </Field>
            <Field label="WhatsApp" error={errors.has("whatsapp")} msg="Informe um WhatsApp com DDD">
              <input inputMode="tel" autoComplete="tel" placeholder="(44) 99999-9999" value={contact.whatsapp} onChange={(e) => { setContact({ ...contact, whatsapp: maskPhone(e.target.value) }); setErrors((x) => { const n = new Set(x); n.delete("whatsapp"); return n; }); }} />
            </Field>
            <Field label="E-mail" error={errors.has("email")} msg="Informe um e-mail válido">
              <input type="email" autoComplete="email" value={contact.email} onChange={(e) => { setContact({ ...contact, email: e.target.value }); setErrors((x) => { const n = new Set(x); n.delete("email"); return n; }); }} />
            </Field>
            <Field label="Instagram da clínica" optional>
              <input placeholder="@suaclinica" value={contact.instagram} onChange={(e) => setContact({ ...contact, instagram: e.target.value })} />
            </Field>
            {/* honeypot anti-robô: invisível para pessoas */}
            <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden value={honey} onChange={(e) => setHoney(e.target.value)} name="website" />
          </div>
        )}

        {step >= 1 && step <= 4 && sectionQs(step).map((q) => (
          <QuestionBlock key={q.id} q={q} answers={answers} set={set} error={errors.has(q.id)} />
        ))}

        {step === LAST_STEP && (
          <div className="review">
            <p>Confira se está tudo certo. Você pode voltar para ajustar qualquer resposta.</p>
            <label className={`consent ${errors.has("lgpd") ? "has-error" : ""}`}>
              <input type="checkbox" checked={lgpd} onChange={(e) => { setLgpd(e.target.checked); setErrors(new Set()); }} />
              <span>
                Autorizo a Ônica Perfumaria Artesanal a usar meus dados e minhas respostas para desenvolver minha identidade
                olfativa e entrar em contato comigo, conforme a Lei Geral de Proteção de Dados (LGPD). Posso solicitar a
                exclusão dos meus dados a qualquer momento.
              </span>
            </label>
            {errors.has("lgpd") && <p className="error-text">É necessário autorizar para enviar.</p>}
            {sendError && <p className="error-text" role="alert">{sendError}</p>}
          </div>
        )}

        {errors.size > 0 && step <= 4 && <p className="error-text" role="alert">Preencha os campos destacados para continuar.</p>}

        <div className="nav">
          {step > 0 ? <button className="btn ghost" onClick={() => { setErrors(new Set()); setStep(step - 1); }}>Voltar</button> : <span />}
          {step < LAST_STEP
            ? <button className="btn" onClick={next}>Continuar</button>
            : <button className="btn" onClick={submit} disabled={sending}>{sending ? "Enviando…" : "Enviar respostas"}</button>}
        </div>
      </section>

      <footer className="foot">Ônica · Perfumaria Artesanal</footer>
    </main>
  );
}

function Header({ compact }: { compact?: boolean }) {
  return (
    <header className={`brand ${compact ? "compact" : ""}`}>
      <img src="/logo-onica.png" alt="Ônica Perfumaria Artesanal" width={220} />
    </header>
  );
}

function Field({ label, children, error, msg, optional }: { label: string; children: React.ReactNode; error?: boolean; msg?: string; optional?: boolean }) {
  return (
    <label className={`field ${error ? "has-error" : ""}`}>
      <span className="field-label">{label}{optional && <em> (opcional)</em>}</span>
      {children}
      {error && msg && <span className="error-text">{msg}</span>}
    </label>
  );
}

function QuestionBlock({ q, answers, set, error }: { q: Question; answers: Answers; set: (id: string, v: string | string[]) => void; error: boolean }) {
  const n = questionNumber(q.id);
  const v = answers[q.id];
  const marker = otherMarker(q);
  const outraId = `${q.id}_outra`;
  const outraVal = (answers[outraId] as string) ?? "";

  const toggleMulti = (opt: string) => {
    const cur = Array.isArray(v) ? v : [];
    if (cur.includes(opt)) return set(q.id, cur.filter((x) => x !== opt));
    if (q.max && cur.length >= q.max) return;
    set(q.id, [...cur, opt]);
  };

  return (
    <fieldset className={`q ${error ? "has-error" : ""}`}>
      <legend><span className="qn">{n}.</span> {q.label}{q.required && <span className="req" aria-label="obrigatória"> *</span>}</legend>
      {q.help && <p className="help">{q.help}</p>}

      {q.type === "textarea" && (
        <textarea rows={3} placeholder={q.placeholder} value={(v as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />
      )}

      {q.type === "triple" && (
        <div className="triple">
          {[0, 1, 2].map((i) => (
            <input key={i} placeholder={`${i + 1}ª característica`} value={(Array.isArray(v) ? v[i] : "") ?? ""}
              onChange={(e) => { const cur = Array.isArray(v) ? [...v] : ["", "", ""]; cur[i] = e.target.value; set(q.id, cur); }} />
          ))}
        </div>
      )}

      {q.type === "single" && (
        <div className="opts">
          {[...(q.options ?? []), ...(q.other ? [marker] : [])].map((opt) => (
            <label key={opt} className={`opt ${v === opt ? "on" : ""}`}>
              <input type="radio" name={q.id} checked={v === opt} onChange={() => set(q.id, opt)} />
              <span>{opt === marker && q.other ? `${marker}…` : opt}</span>
            </label>
          ))}
        </div>
      )}

      {q.type === "multi" && (
        <div className="opts">
          {[...(q.options ?? []), ...(q.other ? [marker] : [])].map((opt) => {
            const on = Array.isArray(v) && v.includes(opt);
            const blocked = !on && !!q.max && Array.isArray(v) && v.length >= q.max;
            return (
              <label key={opt} className={`opt ${on ? "on" : ""} ${blocked ? "off" : ""}`}>
                <input type="checkbox" checked={on} disabled={blocked} onChange={() => toggleMulti(opt)} />
                <span>{opt === marker && q.other ? `${marker}…` : opt}</span>
              </label>
            );
          })}
          {q.max && <p className="help">{Array.isArray(v) ? v.length : 0} de {q.max} selecionadas</p>}
        </div>
      )}

      {q.other && (q.type === "single" ? v === marker : Array.isArray(v) && v.includes(marker)) && (
        <input className="other-input" placeholder="Conte mais…" value={outraVal} onChange={(e) => set(outraId, e.target.value)} />
      )}
      {error && <p className="error-text">Esta pergunta é obrigatória.</p>}
    </fieldset>
  );
}
