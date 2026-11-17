import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { parseNum, type Seller } from "../../lib/sales";

type Draft = { name: string; pct: string };

export default function Sellers() {
  const [rows, setRows] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ name: "", pct: "0" });
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("onica_sellers").select("id,name,commission_pct,active").order("active", { ascending: false }).order("name");
    if (error) setErr("Não foi possível carregar as vendedoras."); else setRows((data ?? []) as Seller[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function start(s?: Seller) {
    setErr("");
    setEditing(s?.id ?? "novo");
    setDraft({ name: s?.name ?? "", pct: String(s?.commission_pct ?? 0).replace(".", ",") });
  }

  async function save() {
    const pct = parseNum(draft.pct);
    if (!draft.name.trim()) return setErr("Informe o nome.");
    if (Number.isNaN(pct) || pct < 0 || pct > 100) return setErr("Comissão deve ficar entre 0 e 100%.");
    setSaving(true);
    const payload = { name: draft.name.trim(), commission_pct: pct };
    const { error } = editing === "novo"
      ? await supabase.from("onica_sellers").insert(payload)
      : await supabase.from("onica_sellers").update(payload).eq("id", editing!);
    setSaving(false);
    if (error) return setErr(error.code === "23505" ? "Já existe uma vendedora com esse nome." : "Não foi possível salvar.");
    setEditing(null);
    load();
  }

  async function toggle(s: Seller) {
    const { error } = await supabase.from("onica_sellers").update({ active: !s.active }).eq("id", s.id);
    if (!error) setRows((rs) => rs.map((r) => (r.id === s.id ? { ...r, active: !s.active } : r)));
  }

  const form = (
    <div className="edit-box">
      <div className="grid-edit two">
        <label className="field"><span className="field-label">Nome</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={80} autoFocus /></label>
        <label className="field"><span className="field-label">Comissão (%)</span>
          <input inputMode="decimal" value={draft.pct} onChange={(e) => setDraft({ ...draft, pct: e.target.value })} placeholder="0" /></label>
      </div>
      {err && <p className="error-text">{err}</p>}
      <div className="nav">
        <button className="btn ghost sm" onClick={() => setEditing(null)}>Cancelar</button>
        <button className="btn sm" disabled={saving} onClick={save}>{saving ? "Salvando…" : "Salvar"}</button>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-head">
        <h2>Vendedoras</h2>
        {editing !== "novo" && <button className="btn sm" onClick={() => start()}>+ Nova vendedora</button>}
      </div>
      <p className="muted small">A comissão é calculada sobre o total da venda (já com desconto). Mudar o % vale para as próximas vendas; as já registradas mantêm o % da época.</p>
      {editing === "novo" && form}
      {loading && <p className="muted">Carregando…</p>}
      {!editing && err && <p className="error-text">{err}</p>}
      {!loading && !rows.length && editing !== "novo" && <p className="muted empty">Nenhuma vendedora cadastrada ainda.</p>}
      <div className="list">
        {rows.map((s) => editing === s.id ? <div key={s.id}>{form}</div> : (
          <div key={s.id} className={`row ${s.active ? "" : "inactive"}`}>
            <div className="row-main"><strong>{s.name}</strong></div>
            <div className="row-meta">
              <span>Comissão {String(s.commission_pct).replace(".", ",")}%</span>
              {!s.active && <span className="pill">Inativa</span>}
              <button className="link" onClick={() => start(s)}>Editar</button>
              <button className="link" onClick={() => toggle(s)}>{s.active ? "Desativar" : "Ativar"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
