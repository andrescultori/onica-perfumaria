import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { money, parseNum, type Product } from "../../lib/sales";

type Draft = { name: string; line: string; price: string; sort: string };
const toDraft = (p?: Product): Draft => ({
  name: p?.name ?? "", line: p?.line ?? "", price: p ? String(p.price).replace(".", ",") : "", sort: String(p?.sort ?? 100),
});

export default function Products() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null); // id ou "novo"
  const [draft, setDraft] = useState<Draft>(toDraft());
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data, error } = await supabase.from("onica_products").select("id,name,line,price,active,sort").order("sort").order("name");
    if (error) setErr("Não foi possível carregar os produtos."); else setRows((data ?? []) as Product[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const lines = [...new Set(rows.map((r) => r.line))];

  function start(p?: Product) { setErr(""); setEditing(p?.id ?? "novo"); setDraft(toDraft(p)); }

  async function save() {
    const price = parseNum(draft.price);
    const sort = Number(draft.sort) || 100;
    if (!draft.name.trim()) return setErr("Informe o nome.");
    if (!draft.line.trim()) return setErr("Informe a linha.");
    if (Number.isNaN(price) || price < 0) return setErr("Preço inválido.");
    setSaving(true);
    const payload = { name: draft.name.trim(), line: draft.line.trim(), price, sort };
    const { error } = editing === "novo"
      ? await supabase.from("onica_products").insert(payload)
      : await supabase.from("onica_products").update(payload).eq("id", editing!);
    setSaving(false);
    if (error) return setErr(error.code === "23505" ? "Já existe um produto com esse nome." : "Não foi possível salvar.");
    setEditing(null);
    load();
  }

  async function toggle(p: Product) {
    const { error } = await supabase.from("onica_products").update({ active: !p.active }).eq("id", p.id);
    if (!error) setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, active: !p.active } : r)));
  }

  const form = (
    <div className="edit-box">
      <div className="grid-edit">
        <label className="field"><span className="field-label">Nome</span>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={120} autoFocus /></label>
        <label className="field"><span className="field-label">Linha</span>
          <input list="onica-lines" value={draft.line} onChange={(e) => setDraft({ ...draft, line: e.target.value })} maxLength={60} placeholder="Ex.: Body Splash" /></label>
        <label className="field"><span className="field-label">Preço (R$)</span>
          <input inputMode="decimal" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="79,90" /></label>
        <label className="field"><span className="field-label">Ordem</span>
          <input type="number" value={draft.sort} onChange={(e) => setDraft({ ...draft, sort: e.target.value })} /></label>
      </div>
      <datalist id="onica-lines">{lines.map((l) => <option key={l} value={l} />)}</datalist>
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
        <h2>Produtos</h2>
        {editing !== "novo" && <button className="btn sm" onClick={() => start()}>+ Novo produto</button>}
      </div>
      <p className="muted small">Mudar o preço vale para as próximas vendas; as já registradas guardam o preço da época. Produtos inativos somem do formulário de venda.</p>
      {editing === "novo" && form}
      {loading && <p className="muted">Carregando…</p>}
      {!editing && err && <p className="error-text">{err}</p>}
      <div className="list">
        {rows.map((p) => editing === p.id ? <div key={p.id}>{form}</div> : (
          <div key={p.id} className={`row ${p.active ? "" : "inactive"}`}>
            <div className="row-main"><strong>{p.name}</strong><span className="muted small">{p.line}</span></div>
            <div className="row-meta">
              <span>{money(p.price)}</span>
              {!p.active && <span className="pill">Inativo</span>}
              <button className="link" onClick={() => start(p)}>Editar</button>
              <button className="link" onClick={() => toggle(p)}>{p.active ? "Desativar" : "Ativar"}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
