import { QUESTIONS, STATUS_LABEL, answerText, questionNumber, type Answers } from "./questions";

export interface Submission {
  id: string;
  created_at: string;
  status: "novo" | "em_analise" | "concluido";
  nome: string;
  whatsapp: string;
  email: string;
  instagram: string | null;
  lgpd_consent_at: string;
  answers: Answers;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const csvCell = (v: unknown) => {
  let s = String(v ?? "").replace(/\r?\n/g, " ");
  // evita injeção de fórmula ao abrir no Excel/Sheets
  if (/^[=+\-@\t]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function downloadCsv(rows: Submission[], filename = "onica-identidade-olfativa.csv") {
  const head = ["Data", "Status", "Nome", "WhatsApp", "E-mail", "Instagram", ...QUESTIONS.map((q) => `${questionNumber(q.id)}. ${q.label}`)];
  const lines = [head.map(csvCell).join(";")];
  for (const r of rows) {
    lines.push(
      [fmtDate(r.created_at), STATUS_LABEL[r.status], r.nome, r.whatsapp, r.email, r.instagram ? `@${r.instagram}` : "",
        ...QUESTIONS.map((q) => answerText(q, r.answers))].map(csvCell).join(";"),
    );
  }
  // BOM para acentos corretos no Excel
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export const waLink = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return `https://wa.me/${d.startsWith("55") ? d : "55" + d}`;
};
