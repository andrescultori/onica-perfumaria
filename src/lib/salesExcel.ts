import type { Sale } from "./sales";
import { groupBy, groupProducts } from "./sales";

const OLIVE = "FF5A5A40";
const CREAM = "FFFBF4DF";
const BRL = '"R$" #,##0.00';

type Col = { header: string; key: string; width: number; money?: boolean; date?: boolean };

// Data real no Excel (filtra/ordena por data), não texto.
const xlDate = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); };

/** Gera e baixa o .xlsx de vendas. exceljs é carregado só no clique (não pesa o app). */
export async function downloadSalesXlsx(sales: Sale[], periodLabel: string, filename: string) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ônica Perfumaria";
  wb.created = new Date();

  const active = sales.filter((s) => s.status === "ativa");

  function sheet(name: string, cols: Col[], rows: Record<string, unknown>[], totals?: Record<string, unknown>) {
    const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 3 }] });
    ws.mergeCells(1, 1, 1, cols.length);
    const title = ws.getCell(1, 1);
    title.value = `Ônica Perfumaria · ${name} · ${periodLabel}`;
    title.font = { bold: true, size: 14, color: { argb: OLIVE } };
    ws.addRow([]);
    ws.columns = cols.map((c) => ({ key: c.key, width: c.width }));
    const head = ws.getRow(3);
    head.values = cols.map((c) => c.header);
    head.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OLIVE } };
      cell.alignment = { vertical: "middle" };
    });
    head.height = 20;
    for (const r of rows) ws.addRow(r);
    if (totals) {
      const tr = ws.addRow(totals);
      tr.eachCell((cell) => {
        cell.font = { bold: true };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
      });
    }
    cols.forEach((c, i) => {
      if (c.money) ws.getColumn(i + 1).numFmt = BRL;
      if (c.date) ws.getColumn(i + 1).numFmt = "dd/mm/yyyy";
    });
    if (rows.length) ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: cols.length } };
    return ws;
  }

  const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + Number(b), 0) * 100) / 100;

  // 1) Vendas — uma linha por venda
  sheet("Vendas", [
    { header: "Data", key: "data", width: 12, date: true },
    { header: "Vendedora", key: "vend", width: 20 },
    { header: "Produtos", key: "prod", width: 48 },
    { header: "Qtd. itens", key: "qtd", width: 10 },
    { header: "Subtotal", key: "sub", width: 13, money: true },
    { header: "Desconto", key: "desc", width: 13, money: true },
    { header: "Total", key: "total", width: 13, money: true },
    { header: "Pagamento", key: "pag", width: 18 },
    { header: "Comissão %", key: "cpct", width: 11 },
    { header: "Comissão R$", key: "cval", width: 13, money: true },
    { header: "Cliente", key: "cli", width: 22 },
    { header: "Observações", key: "obs", width: 30 },
    { header: "Status", key: "st", width: 11 },
    { header: "Registrada por", key: "by", width: 26 },
  ], sales.map((s) => ({
    data: xlDate(s.sold_on), vend: s.seller_name,
    prod: s.onica_sale_items.map((i) => `${i.qty}x ${i.product_name}`).join("; "),
    qtd: sum(s.onica_sale_items.map((i) => i.qty)),
    sub: Number(s.subtotal), desc: Number(s.discount_amount), total: Number(s.total),
    pag: s.payment_method, cpct: Number(s.commission_pct), cval: Number(s.commission_amount),
    cli: s.customer ?? "", obs: s.notes ?? "", st: s.status === "ativa" ? "Ativa" : "Cancelada", by: s.created_by_email ?? "",
  })), {
    data: "Total (ativas)", qtd: sum(active.flatMap((s) => s.onica_sale_items.map((i) => i.qty))),
    sub: sum(active.map((s) => s.subtotal)), desc: sum(active.map((s) => s.discount_amount)),
    total: sum(active.map((s) => s.total)), cval: sum(active.map((s) => s.commission_amount)),
  });

  // 2) Itens — uma linha por produto vendido (preço de tabela, antes do desconto da venda)
  const items = active.flatMap((s) => s.onica_sale_items.map((i) => ({ s, i })));
  sheet("Itens", [
    { header: "Data", key: "data", width: 12, date: true },
    { header: "Vendedora", key: "vend", width: 20 },
    { header: "Produto", key: "prod", width: 36 },
    { header: "Linha", key: "linha", width: 20 },
    { header: "Qtd.", key: "qtd", width: 8 },
    { header: "Valor unitário", key: "unit", width: 14, money: true },
    { header: "Valor bruto", key: "bruto", width: 14, money: true },
    { header: "Pagamento", key: "pag", width: 18 },
  ], items.map(({ s, i }) => ({
    data: xlDate(s.sold_on), vend: s.seller_name, prod: i.product_name, linha: i.product_line,
    qtd: i.qty, unit: Number(i.unit_price), bruto: Number(i.line_total), pag: s.payment_method,
  })), { data: "Total", qtd: sum(items.map((x) => x.i.qty)), bruto: sum(items.map((x) => x.i.line_total)) });

  // 3) Por vendedora (com comissão)
  const bySeller = groupBy(active, (s) => s.seller_name);
  sheet("Por vendedora", [
    { header: "Vendedora", key: "k", width: 22 },
    { header: "Vendas", key: "n", width: 10 },
    { header: "Itens", key: "it", width: 10 },
    { header: "Total vendido", key: "t", width: 15, money: true },
    { header: "Ticket médio", key: "tm", width: 14, money: true },
    { header: "Comissão", key: "c", width: 14, money: true },
  ], bySeller.map((g) => ({ k: g.key, n: g.sales, it: g.items, t: g.total, tm: g.sales ? g.total / g.sales : 0, c: g.commission })),
  { k: "Total", n: sum(bySeller.map((g) => g.sales)), it: sum(bySeller.map((g) => g.items)), t: sum(bySeller.map((g) => g.total)), c: sum(bySeller.map((g) => g.commission)) });

  // 4) Por produto
  const byProduct = groupProducts(active);
  sheet("Por produto", [
    { header: "Produto", key: "k", width: 36 },
    { header: "Linha", key: "l", width: 20 },
    { header: "Qtd. vendida", key: "q", width: 13 },
    { header: "Valor bruto", key: "g", width: 15, money: true },
  ], byProduct.map((g) => ({ k: g.key, l: g.line, q: g.qty, g: g.gross })),
  { k: "Total", q: sum(byProduct.map((g) => g.qty)), g: sum(byProduct.map((g) => g.gross)) });

  // 5) Por forma de pagamento
  const byPay = groupBy(active, (s) => s.payment_method);
  sheet("Por pagamento", [
    { header: "Forma de pagamento", key: "k", width: 22 },
    { header: "Vendas", key: "n", width: 10 },
    { header: "Total", key: "t", width: 15, money: true },
  ], byPay.map((g) => ({ k: g.key, n: g.sales, t: g.total })),
  { k: "Total", n: sum(byPay.map((g) => g.sales)), t: sum(byPay.map((g) => g.total)) });

  const buf = await wb.xlsx.writeBuffer();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
