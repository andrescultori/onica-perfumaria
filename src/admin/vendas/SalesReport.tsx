import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  PAYMENT_METHODS, SALE_SELECT, discountLabel, fmtDay, groupBy, groupProducts, money, today,
  type Sale, type Seller,
} from "../../lib/sales";

type Period = "mes" | "mes_anterior" | "30d" | "ano" | "custom";

function rangeFor(p: Period, from: string, to: string): [string, string] {
  const t = today();
  const [y, m] = t.split("-").map(Number);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (p === "mes") return [`${t.slice(0, 7)}-01`, t];
  if (p === "mes_anterior") {
    const start = new Date(Date.UTC(y, m - 2, 1));
    const end = new Date(Date.UTC(y, m - 1, 0));
    return [iso(start), iso(end)];
  }
  if (p === "30d") { const d = new Date(`${t}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 29); return [iso(d), t]; }
  if (p === "ano") return [`${y}-01-01`, t];
  return [from || t, to || t];
}

export default function SalesReport() {
  const [period, setPeriod] = useState<Period>("mes");
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(today());
  const [sellerId, setSellerId] = useState("todas");
  const [payment, setPayment] = useState("todas");
  const [showCanceled, setShowCanceled] = useState(false);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [rows, setRows] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [start, end] = rangeFor(period, from, to);

  useEffect(() => {
    supabase.from("onica_sellers").select("id,name,commission_pct,active").order("name")
      .then(({ data }) => setSellers((data ?? []) as Seller[]));
  }, []);

  useEffect(() => {
    setLoading(true);
    setErr("");
    supabase.from("onica_sales").select(SALE_SELECT)
      .gte("sold_on", start).lte("sold_on", end)
      .order("sold_on", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setErr("Não foi possível carregar as vendas."); else setRows((data ?? []) as unknown as Sale[]);
        setLoading(false);
      });
  }, [start, end]);

  const filtered = useMemo(() => rows.filter((s) =>
    (sellerId === "todas" || s.seller_id === sellerId) &&
    (payment === "todas" || s.payment_method === payment) &&
    (showCanceled || s.status === "ativa")), [rows, sellerId, payment, showCanceled]);
  const active = useMemo(() => filtered.filter((s) => s.status === "ativa"), [filtered]);

  const totals = useMemo(() => {
    const total = active.reduce((a, s) => a + Number(s.total), 0);
    return {
      total, n: active.length, avg: active.length ? total / active.length : 0,
      commission: active.reduce((a, s) => a + Number(s.commission_amount), 0),
      items: active.reduce((a, s) => a + s.onica_sale_items.reduce((b, i) => b + i.qty, 0), 0),
    };
  }, [active]);
  const bySeller = useMemo(() => groupBy(active, (s) => s.seller_name), [active]);
  const byProduct = useMemo(() => groupProducts(active).slice(0, 10), [active]);
  const byPay = useMemo(() => groupBy(active, (s) => s.payment_method), [active]);

  async function cancel(s: Sale) {
    const back = s.status === "cancelada";
    if (!confirm(back ? "Reativar esta venda?" : `Cancelar a venda de ${money(s.total)} (${s.seller_name})? Ela deixa de contar nos relatórios.`)) return;
    const status = back ? "ativa" : "cancelada";
    const { error } = await supabase.from("onica_sales").update({ status }).eq("id", s.id);
    if (error) return alert("Não foi possível atualizar a venda.");
    setRows((rs) => rs.map((r) => (r.id === s.id ? { ...r, status } : r)));
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const { downloadSalesXlsx } = await import("../../lib/salesExcel");
      const label = `${fmtDay(start)} a ${fmtDay(end)}`;
      await downloadSalesXlsx(filtered, label, `onica-vendas_${start}_a_${end}.xlsx`);
    } catch {
      alert("Não foi possível gerar o Excel.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <h2>Vendas</h2>
        <Link to="/admin/vendas/nova" className="btn sm">+ Nova venda</Link>
      </div>

      <div className="toolbar">
        <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label="Período">
          <option value="mes">Este mês</option>
          <option value="mes_anterior">Mês anterior</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="ano">Este ano</option>
          <option value="custom">Personalizado</option>
        </select>
        {period === "custom" && (
          <>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="De" className="date-sm" />
            <input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} aria-label="Até" className="date-sm" />
          </>
        )}
        <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} aria-label="Vendedora">
          <option value="todas">Todas as vendedoras</option>
          {sellers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={payment} onChange={(e) => setPayment(e.target.value)} aria-label="Pagamento">
          <option value="todas">Todos os pagamentos</option>
          {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
        </select>
        <label className="check"><input type="checkbox" checked={showCanceled} onChange={(e) => setShowCanceled(e.target.checked)} /> Mostrar canceladas</label>
        <button className="btn sm" disabled={!filtered.length || exporting} onClick={exportXlsx}>{exporting ? "Gerando…" : "Baixar Excel"}</button>
      </div>
      <p className="muted small">Período: {fmtDay(start)} a {fmtDay(end)}</p>

      <div className="stats">
        <Stat label="Total vendido" v={money(totals.total)} accent />
        <Stat label="Vendas" v={String(totals.n)} />
        <Stat label="Ticket médio" v={money(totals.avg)} />
        <Stat label="Comissões" v={money(totals.commission)} />
      </div>

      {loading && <p className="muted">Carregando…</p>}
      {err && <p className="error-text">{err}</p>}

      {!loading && !err && (
        <>
          <div className="report-grid">
            <section className="card">
              <h3>Por vendedora</h3>
              <Table head={["Vendedora", "Vendas", "Total", "Comissão"]}
                rows={bySeller.map((g) => [g.key, String(g.sales), money(g.total), money(g.commission)])} />
            </section>
            <section className="card">
              <h3>Por pagamento</h3>
              <Table head={["Forma", "Vendas", "Total"]} rows={byPay.map((g) => [g.key, String(g.sales), money(g.total)])} />
            </section>
            <section className="card wide">
              <h3>Produtos mais vendidos</h3>
              <Table head={["Produto", "Qtd.", "Valor bruto"]} rows={byProduct.map((g) => [g.key, String(g.qty), money(g.gross)])} />
            </section>
          </div>

          <h3 className="list-title">Lançamentos ({filtered.length})</h3>
          {!filtered.length && <p className="muted empty">Nenhuma venda neste período.</p>}
          <div className="list">
            {filtered.map((s) => (
              <div key={s.id} className={`row sale ${s.status}`}>
                <button className="row-click" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
                  <div className="row-main">
                    <strong>{money(s.total)} · {s.seller_name}</strong>
                    <span className="muted clinic">{s.onica_sale_items.map((i) => `${i.qty}x ${i.product_name}`).join(", ")}</span>
                  </div>
                  <div className="row-meta">
                    <span className="muted">{s.payment_method}</span>
                    <span className="muted">{fmtDay(s.sold_on)}</span>
                    {s.status === "cancelada" && <span className="pill">Cancelada</span>}
                  </div>
                </button>
                {open === s.id && (
                  <div className="sale-detail">
                    <table className="tbl">
                      <tbody>
                        {s.onica_sale_items.map((i) => (
                          <tr key={i.id}><td>{i.qty}x {i.product_name}</td><td className="num">{money(i.unit_price)}</td><td className="num">{money(i.line_total)}</td></tr>
                        ))}
                        <tr><td colSpan={2} className="muted">Subtotal</td><td className="num">{money(s.subtotal)}</td></tr>
                        {s.discount_amount > 0 && <tr><td colSpan={2} className="muted">Desconto ({discountLabel(s)})</td><td className="num">− {money(s.discount_amount)}</td></tr>}
                        <tr><td colSpan={2}><strong>Total</strong></td><td className="num"><strong>{money(s.total)}</strong></td></tr>
                        <tr><td colSpan={2} className="muted">Comissão ({s.commission_pct}%)</td><td className="num">{money(s.commission_amount)}</td></tr>
                      </tbody>
                    </table>
                    {s.customer && <p className="small"><span className="muted">Cliente:</span> {s.customer}</p>}
                    {s.notes && <p className="small"><span className="muted">Obs.:</span> {s.notes}</p>}
                    <p className="small muted">Registrada por {s.created_by_email ?? "—"} em {new Date(s.created_at).toLocaleString("pt-BR")}</p>
                    <button className={`link ${s.status === "ativa" ? "danger" : ""}`} onClick={() => cancel(s)}>
                      {s.status === "ativa" ? "Cancelar venda" : "Reativar venda"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, v, accent }: { label: string; v: string; accent?: boolean }) {
  return <div className={`stat ${accent ? "accent" : ""}`}><span className="stat-n money">{v}</span><span className="stat-l">{label}</span></div>;
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  if (!rows.length) return <p className="muted small">Sem dados no período.</p>;
  return (
    <table className="tbl">
      <thead><tr>{head.map((h, i) => <th key={h} className={i ? "num" : ""}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i} className={i ? "num" : ""}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}
