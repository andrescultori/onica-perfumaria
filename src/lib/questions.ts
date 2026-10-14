// Definição única do questionário: usada pelo formulário público e pela ficha do admin.
// Numeração é automática pela posição. "Cores" e "paleta" (antes 3 e 16) foram unificadas.

export type QType = "text" | "textarea" | "single" | "multi" | "triple";

export interface Question {
  id: string;
  section: number;
  label: string;
  help?: string;
  type: QType;
  options?: string[];
  other?: boolean; // adiciona "Outra/Outros" com campo livre (salvo em `${id}_outra`)
  otherLabel?: string;
  max?: number; // multi: máximo de opções
  required?: boolean;
  placeholder?: string;
  prefix?: string; // textarea: início de frase
}

export const SECTIONS = [
  { title: "Seus dados", subtitle: "Para a equipe da Ônica falar com você" },
  { title: "Sobre você e seu negócio", subtitle: "Conte quem você é e a atmosfera que deseja" },
  { title: "Seus gostos olfativos", subtitle: "O que encanta (e o que incomoda) o seu olfato" },
  { title: "A identidade olfativa do seu negócio", subtitle: "A assinatura que vai representar o seu espaço" },
  { title: "Os produtos que vamos desenvolver", subtitle: "Home spray, perfume de tecidos e lembrancinhas" },
] as const;

export const QUESTIONS: Question[] = [
  // Seção 1 — Sobre você e seu negócio
  {
    id: "q1", section: 1, type: "textarea", required: true,
    label: "Qual é a sua profissão, qual é a especialidade do seu negócio e qual é o nome dele?",
    placeholder: "Ex.: Sou dentista, trabalho com ortodontia e meu negócio se chama…",
  },
  {
    id: "q2", section: 1, type: "single", required: true, other: true,
    label: "Como você gostaria que seus clientes se sentissem ao entrar no seu negócio?",
    options: [
      "Acolhidos e confortáveis",
      "Tranquilos e relaxados",
      "Seguros e confiantes",
      "Em um ambiente sofisticado e exclusivo",
      "Em um ambiente leve, fresco e agradável",
    ],
  },
  {
    id: "q3", section: 1, type: "single", required: true,
    label: "Como você descreveria o estilo do seu negócio e sua decoração?",
    options: [
      "Clean e minimalista",
      "Moderna e sofisticada",
      "Clássica e elegante",
      "Natural, com plantas e madeira",
      "Delicada e acolhedora",
      "Colorida e descontraída",
    ],
  },
  {
    id: "q4", section: 1, type: "textarea",
    label: "Quais são as principais cores e a paleta de cores do seu negócio?",
    placeholder: "Ex.: branco, off-white, madeira clara e detalhes em verde…",
  },

  {
    id: "q20", section: 1, type: "multi", other: true, otherLabel: "Outro",
    label: "Qual é o perfil predominante dos seus clientes?",
    help: "Pode marcar mais de um.",
    options: [
      "Crianças",
      "Adolescentes",
      "Adultos",
      "Idosos",
      "Gestantes",
      "Pessoas em tratamento de saúde",
      "Público variado",
    ],
  },

  // Seção 2 — Seus gostos olfativos
  {
    id: "q5", section: 2, type: "multi", required: true, max: 3,
    label: "Quais tipos de fragrância você mais gosta?",
    help: "Marque até três opções.",
    options: [
      "Cítricas: frescas e vibrantes",
      "Florais: delicadas e elegantes",
      "Amadeiradas: sofisticadas e envolventes",
      "Frutais: alegres e leves",
      "Aquáticas: frescas e limpas",
      "Verdes e herbais: naturais e revigorantes",
      "Adocicadas: aconchegantes e cremosas",
      "Orientais: intensas e marcantes",
      "Almiscaradas: macias e suaves",
      "Ainda não sei identificar",
    ],
  },
  {
    id: "q18", section: 2, type: "multi",
    label: "Quais sensações você prefere em um perfume?",
    help: "Pode marcar mais de uma.",
    options: [
      "Cheiro de banho tomado",
      "Roupa limpa e recém-lavada",
      "Flores frescas",
      "Jardim verde após a chuva",
      "Frutas frescas",
      "Brisa do mar",
      "Madeiras elegantes",
      "Flores sofisticadas",
      "Doçura cremosa",
      "Chá e ervas",
      "Perfume de hotel sofisticado",
      "Aroma confortável, como um abraço",
    ],
  },
  {
    id: "q6", section: 2, type: "textarea",
    label: "Quais perfumes você mais gosta de usar?",
    help: "Se possível, informe até três nomes e marcas.",
  },
  {
    id: "q7", section: 2, type: "textarea",
    label: "Existe algum perfume ou tipo de cheiro de que você não gosta? O que incomoda você?",
  },
  {
    id: "q19", section: 2, type: "multi", other: true, otherLabel: "Outro",
    label: "O que incomoda você em perfumes?",
    help: "Pode marcar mais de uma.",
    options: [
      "Doçura excessiva",
      "Cheiro muito forte",
      "Sensação muito floral",
      "Notas amadeiradas intensas",
      "Aroma cítrico ou ácido demais",
      "Sensação artificial",
      "Cheiro muito atalcado ou empoado",
      "Sensação medicinal",
      "Cheiro que lembra produtos de limpeza",
      "Provocam desconforto, enjoo ou dor de cabeça",
    ],
  },
  {
    id: "q8", section: 2, type: "single", required: true,
    label: "Qual intensidade você prefere para uma fragrância de ambiente?",
    options: [
      "Muito suave, quase imperceptível",
      "Leve e delicada",
      "Moderada, presente sem dominar",
      "Marcante e sofisticada",
    ],
  },
  {
    id: "q9", section: 2, type: "textarea",
    label: "Existe algum cheiro que desperte uma lembrança especial ou uma sensação de bem-estar em você?",
    help: "Pode ser cheiro de natureza, casa limpa, flores, infância, viagens, hotéis ou qualquer outra memória.",
  },

  // Seção 3 — A identidade olfativa do seu negócio
  {
    id: "q10", section: 3, type: "triple", required: true,
    label: "Se a fragrância do seu negócio pudesse transmitir apenas três características, quais seriam?",
    help: "Exemplos: limpeza, acolhimento, sofisticação, tranquilidade, frescor, exclusividade.",
  },
  {
    id: "q11", section: 3, type: "single", required: true,
    label: "Você prefere uma fragrância mais discreta e fácil de agradar ou uma assinatura exclusiva e marcante?",
    options: [
      "Discreta e versátil",
      "Sofisticada e equilibrada",
      "Exclusiva e memorável",
      "Uma combinação dessas características",
    ],
  },
  {
    id: "q12", section: 3, type: "textarea", prefix: "Meu negócio tem um aroma que transmite…",
    label: "Como você gostaria que os clientes descrevessem o cheirinho do seu negócio?",
    help: "Complete: “Meu negócio tem um aroma que transmite…”",
  },

  // Seção 4 — Os produtos
  {
    id: "q13", section: 4, type: "multi", required: true, other: true, otherLabel: "Outros",
    label: "Onde o home spray será utilizado?",
    help: "Pode marcar mais de um.",
    options: ["Recepção e sala de espera", "Consultórios", "Lojas", "Salas de trabalho", "Banheiros e lavabos"],
  },
  {
    id: "q14", section: 4, type: "single", required: true,
    label: "Para o perfume de tecidos, qual sensação você prefere?",
    options: [
      "Roupa limpa e recém-lavada",
      "Frescor e leveza",
      "Maciez e aconchego",
      "Elegância e sofisticação",
      "O mesmo aroma do home spray",
    ],
  },
  {
    id: "q15", section: 4, type: "textarea",
    label: "Como serão as lembrancinhas?",
    help: "Descreva o que você imagina: para quem serão, em quais ocasiões, formato, quantidade aproximada…",
  },
  {
    id: "q16", section: 4, type: "single",
    label: "Qual mensagem você gostaria de transmitir com as lembrancinhas?",
    options: [
      "Carinho e acolhimento",
      "Gratidão pela confiança",
      "Sofisticação e exclusividade",
      "Uma lembrança especial do meu negócio",
    ],
  },
  {
    id: "q17", section: 4, type: "textarea",
    label: "Existe algum ambiente em que você prefere não utilizar fragrâncias?",
  },
];

export type Answers = Record<string, string | string[]>;

export const questionNumber = (id: string) => QUESTIONS.findIndex((q) => q.id === id) + 1;

export const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  concluido: "Concluído",
};

export const otherMarker = (q: Question) => q.otherLabel ?? "Outra";

// Texto legível de uma resposta (admin, CSV e e-mail). A opção "Outra/Outros" guarda o
// marcador como valor e o texto livre em `${id}_outra`.
export function answerText(q: Question, answers: Answers): string {
  const v = answers[q.id];
  const outra = String(answers[`${q.id}_outra`] ?? "").trim();
  const fmt = (x: string) => (q.other && x === otherMarker(q) && outra ? `${x}: ${outra}` : x);
  if (Array.isArray(v)) {
    const items = v.map((x) => String(x).trim()).filter(Boolean);
    return q.type === "triple" ? items.join(" · ") : items.map(fmt).join("; ");
  }
  return typeof v === "string" ? fmt(v.trim()) : "";
}
