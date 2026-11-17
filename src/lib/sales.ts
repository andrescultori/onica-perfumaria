export const PAYMENT_METHODS = ["Pix", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Transferência", "Outro"] as const;

export interface Product { id: string; name: string; line: string; price: number; active: boolean; sort: number }
export interface Seller { id: string; name: string; commission_pct: number; active: boolean }
export interface SaleItem { id: string; product_name: string; product_line: string; unit_price: number; qty: number; line_total: number }
export interface Sale {
  id: string;
  sold_on: string;
  seller_id: string;
  seller_name: string;
  payment_method: string;
  customer: string | null;
  notes: string | null;
  subtotal: number;
  discount_type: "valor" | "percentual" | null;
  discount_value: number;
  discount_amount: number;
  total: number;
  commission_pct: number;
  commission_amount: number;
  status: "ativa" | "cancelada";
  created_by_email: string | null;
  created_at: string;
  onica_sale_items: SaleItem[];
}

export const SALE_SELECT =
  "id,sold_on,seller_id,seller_name,payment_method,customer,notes,subtotal,discount_type,discount_value,discount_amount,total,commission_pct,commission_amount,status,created_by_email,created_at,onica_sale_items(id,product_name,product_line,unit_price,qty,line_total)";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (n: number) => brl.format(Number(n) || 0);
export const fmtDay = (iso: string) => iso.split("-").reverse().join("/");
export const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Interpreta "79,90" / "79.90" / "1.234,50" como número. */
export const parseNum = (s: string) => {
  const t = s.trim();
  if (!t) return 0;
  const norm = t.includes(",") ? t.replace(/\./g, "").replace(",", ".") : t;
  const n = Number(norm);
  return Number.isFinite(n) ? n : NaN;
};

export interface Group { key: string; sales: number; items: number; total: number; commission: number }

export function groupBy(sales: Sale[], key: (s: Sale) => string): Group[] {
  const m = new Map<string, Group>();
  for (const s of sales) {
    const k = key(s);
    const g = m.get(k) ?? { key: k, sales: 0, items: 0, total: 0, commission: 0 };
    g.sales += 1;
    g.items += s.onica_sale_items.reduce((a, i) => a + i.qty, 0);
    g.total += Number(s.total);
    g.commission += Number(s.commission_amount);
    m.set(k, g);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

export interface ProductGroup { key: string; line: string; qty: number; gross: number }

export function groupProducts(sales: Sale[]): ProductGroup[] {
  const m = new Map<string, ProductGroup>();
  for (const s of sales) for (const i of s.onica_sale_items) {
    const g = m.get(i.product_name) ?? { key: i.product_name, line: i.product_line, qty: 0, gross: 0 };
    g.qty += i.qty;
    g.gross += Number(i.line_total);
    m.set(i.product_name, g);
  }
  return [...m.values()].sort((a, b) => b.qty - a.qty || b.gross - a.gross);
}

export const discountLabel = (s: Sale) =>
  !s.discount_amount ? "" : s.discount_type === "percentual" ? `${s.discount_value}%` : money(s.discount_value);
