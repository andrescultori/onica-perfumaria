import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { PAYMENT_METHODS, money, parseNum, round2, today, type Product, type Seller } from "../../lib/sales";

type Line = { key: number; productId: string; qty: number };
let nextKey = 1;
const blankLine = (): Line => ({ key: nextKey++, productId: "", qty: 1 });

export default function NewSale() {
  const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  const [soldOn, setSoldOn] = useState(today());
  const [sellerId, setSellerId] = useState(() => localStorage.getItem("onica_last_seller") ?? "");
  const [lines, setLines] = useState<Line[]>([blankLine()]);
  const [payment, setPayment] = useState<string>("Pix");
  const [discType, setDiscType] = useState<"valor" | "percentual">("valor");
  const [discText, setDiscText] = useState("");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      supabase.from("onica_products").select("id,name,line,price,active,sort").eq("active", true).order("sort").order("name"),
      supabase.from("onica_sellers").select("id,name,commission_pct,active").eq("active", true).order("name"),
    ]).then(([p, s]) => {
      if (p.error || s.error) setErr("Não foi possível carregar produtos e vendedoras.");
      setProducts((p.data ?? []) as Product[]);
      const sl = (s.data ?? []) as Seller[];
      setSellers(sl);
      setSellerId((cur) => (sl.some((x) => x.id === cur) ? cur : ""));
      setLoading(false);
    });
  }, []);

  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const lineGroups = useMemo(() => {
    const m = new Map<string, Product[]>();
    for (const p of products) m.set(p.line, [...(m.get(p.line) ?? []), p]);
    return [...m.entries()];
  }, [products]);

  const subtotal = round2(lines.reduce((a, l) => a + (byId.get(l.productId)?.price ?? 0) * (l.qty || 0), 0));
  const discNum = parseNum(discText);
  const discountErr = Number.isNaN(discNum) || discNum < 0 ? "Valor inválido"
    : discType === "percentual" && discNum > 100 ? "Máximo 100%" : "";
  const discount = discountErr ? 0
    : discType === "valor" ? Math.min(discNum, subtotal) : round2((subtotal * discNum) / 100);
  const total = round2(subtotal - discount);

  function setLine(key: number, patch: Partial<Line>) {
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const valid = lines.filter((l) => l.productId);
    if (!sellerId) return setErr("Escolha a vendedora.");
    if (!valid.length) return setErr("Inclua ao menos um produto.");
    if (valid.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > 999)) return setErr("Confira as quantidades.");
    if (discountErr) return setErr("Confira o desconto.");
    setSaving(true);
    const { error } = await supabase.rpc("onica_create_sale", {
      p_sold_on: soldOn,
      p_seller_id: sellerId,
      p_payment_method: payment,
      p_items: valid.map((l) => ({ product_id: l.productId, qty: l.qty })),
      p_customer: customer,
      p_notes: notes,
      p_discount_type: discNum > 0 ? discType : null,
      p_discount_value: discNum > 0 ? discNum : 0,
    });
    setSaving(false);
    if (error) return setErr(`Não foi possível registrar: ${error.message}`);
    localStorage.setItem("onica_last_seller", sellerId);
    setDone(total);
    setLines([blankLine()]);
    setDiscText("");
    setCustomer("");
    setNotes("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loading) return <p className="muted">Carregando…</p>;

  return (
    <div className="sale-wrap">
      <div className="page-head">
        <h2>Nova venda</h2>
        <Link to="/admin/vendas" className="link">Ver vendas</Link>
      </div>

      {done !== null && (
        <div className="notice ok" role="status">
          Venda de <strong>{money(done)}</strong> registrada.{" "}
          <button className="link" onClick={() => setDone(null)}>Registrar outra</button> ·{" "}
          <button className="link" onClick={() => nav("/admin/vendas")}>Ver relatório</button>
        </div>
      )}

      {!sellers.length && (
        <div className="notice">Cadastre ao menos uma vendedora em <Link to="/admin/vendedoras">Vendedoras</Link> antes de registrar vendas.</div>
      )}

      <form className="card fields" onSubmit={submit}>
        <div className="grid2">
          <label className="field">
            <span className="field-label">Data da venda</span>
            <input type="date" value={soldOn} max={today()} onChange={(e) => setSoldOn(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field-label">Vendedora</span>
            <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} required>
              <option value="">Selecione…</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>

        <div className="field">
          <span className="field-label">Produtos</span>
          <div className="items">
            {lines.map((l) => {
              const p = byId.get(l.productId);
              return (
                <div className="item" key={l.key}>
                  <select value={l.productId} onChange={(e) => setLine(l.key, { productId: e.target.value })} aria-label="Produto">
                    <option value="">Selecione um produto</option>
                    {lineGroups.map(([line, ps]) => (
                      <optgroup key={line} label={line}>
                        {ps.map((x) => <option key={x.id} value={x.id}>{x.name} — {money(x.price)}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <div className="item-row">
                    <div className="qty">
                      <button type="button" className="qty-btn" onClick={() => setLine(l.key, { qty: Math.max(1, l.qty - 1) })} aria-label="Diminuir">−</button>
                      <input type="number" inputMode="numeric" min={1} max={999} value={l.qty}
                        onChange={(e) => setLine(l.key, { qty: Math.floor(Number(e.target.value)) || 0 })} aria-label="Quantidade" />
                      <button type="button" className="qty-btn" onClick={() => setLine(l.key, { qty: Math.min(999, l.qty + 1) })} aria-label="Aumentar">+</button>
                    </div>
                    <span className="item-total">{money((p?.price ?? 0) * (l.qty || 0))}</span>
                    {lines.length > 1 && (
                      <button type="button" className="link danger" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}>Remover</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn ghost sm add-item" onClick={() => setLines((ls) => [...ls, blankLine()])}>+ Adicionar produto</button>
        </div>

        <div className="grid2">
          <label className="field">
            <span className="field-label">Forma de pagamento</span>
            <select value={payment} onChange={(e) => setPayment(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <div className={`field ${discountErr ? "has-error" : ""}`}>
            <span className="field-label">Desconto <em>(opcional)</em></span>
            <div className="disc">
              <div className="seg" role="group" aria-label="Tipo de desconto">
                <button type="button" className={discType === "valor" ? "on" : ""} onClick={() => setDiscType("valor")}>R$</button>
                <button type="button" className={discType === "percentual" ? "on" : ""} onClick={() => setDiscType("percentual")}>%</button>
              </div>
              <input inputMode="decimal" placeholder={discType === "valor" ? "0,00" : "0"} value={discText} onChange={(e) => setDiscText(e.target.value)} aria-label="Valor do desconto" />
            </div>
            {discountErr && <p className="error-text">{discountErr}</p>}
          </div>
        </div>

        <label className="field">
          <span className="field-label">Cliente <em>(opcional)</em></span>
          <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" maxLength={120} />
        </label>
        <label className="field">
          <span className="field-label">Observações <em>(opcional)</em></span>
          <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </label>

        <div className="totals">
          <div><span className="muted">Subtotal</span><span>{money(subtotal)}</span></div>
          {discount > 0 && <div><span className="muted">Desconto</span><span>− {money(discount)}</span></div>}
          <div className="grand"><span>Total</span><span>{money(total)}</span></div>
        </div>

        {err && <p className="error-text">{err}</p>}
        <button className="btn block" type="submit" disabled={saving || !sellers.length}>{saving ? "Registrando…" : "Registrar venda"}</button>
      </form>
    </div>
  );
}
