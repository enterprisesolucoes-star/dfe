export interface ScoreItem {
  label: string;
  points: number;
}

export interface TableRow {
  [key: string]: string;
}

export interface Summary {
  id: string | number;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  date: string;
  readingTime: string;
  author: string;
  imageUrl?: string;
  score?: {
    name: string;
    items: ScoreItem[];
  };
  table?: {
    title: string;
    headers: string[];
    rows: TableRow[];
  };
}

export const SUMMARIES: Summary[] = [
  {
    id: "1",
    title: "Manejo da Crise Hipertensiva",
    excerpt: "Protocolo atualizado para diferenciação entre urgência e emergência hipertensiva e escolha medicamentosa.",
    content: `
      ### Definição e Classificação
      A crise hipertensiva é caracterizada por elevação aguda da PA (geralmente > 180/120 mmHg). 
      
      #### Emergência Hipertensiva
      Há lesão de órgão-alvo aguda e progressiva (EAP, IAM, AVC, Dissecção de Aorta). Exige redução imediata da PA com drogas parenterais.
      
      #### Urgência Hipertensiva
      Não há lesão de órgão-alvo iminente. A redução pode ser feita em 24-48h com medicações via oral.
    `,
    category: "Clínica Médica",
    date: "21 abr 2026",
    readingTime: "7 min",
    author: "Dr. Roberto Silva",
    imageUrl: "/images/hipertensao.jpg",
    table: {
      title: "Principais Drogas na Emergência",
      headers: ["Medicação", "Indicação", "Dose Inicial"],
      rows: [
        { "Medicação": "Nitroprussiato", "Indicação": "Maioria das emergências", "Dose Inicial": "0,25 - 0,5 mcg/kg/min" },
        { "Medicação": "Nitroglicerina", "Indicação": "Coronariopatia / EAP", "Dose Inicial": "5 mcg/min" },
        { "Medicação": "Esmolol", "Indicação": "Dissecção de Aorta", "Dose Inicial": "500 mcg/kg (bolus)" }
      ]
    }
  },
  {
    id: "2",
    title: "Apendicite Aguda: Diagnóstico Sugerido",
    excerpt: "Abordagem diagnóstica baseada no Escore de Alvarado e conduta cirúrgica contemporânea.",
    content: `
      ### Quadro Clínico
      A dor clássica inicia-se na região periumbilical e migra para a fossa ilíaca direita (Ponto de McBurney).
      
      #### Sinais Físicos
      - **Blumberg**: Dor à descompressão brusca na FID.
      - **Rovsing**: Dor na FID ao comprimir a fossa ilíaca esquerda.
    `,
    category: "Cirurgia",
    date: "20 abr 2026",
    readingTime: "10 min",
    author: "Dra. Ana Costa",
    imageUrl: "/images/apendicite.jpg",
    score: {
      name: "Escore de Alvarado",
      items: [
        { label: "Migração da dor para FID", points: 1 },
        { label: "Anorexia", points: 1 },
        { label: "Náuseas e Vômitos", points: 1 },
        { label: "Defesa em fossa ilíaca direita", points: 2 },
        { label: "Dor à descompressão (Blumberg)", points: 1 },
        { label: "Elevação de temperatura (> 37,3ºC)", points: 1 },
        { label: "Leucocitose (> 10.000)", points: 2 },
        { label: "Desvio à esquerda no hemograma", points: 1 }
      ]
    }
  },
  {
    id: "3",
    title: "Sepse e Choque Séptico: Protocolo 2024",
    excerpt: "Principais mudanças no bundle de 1 hora e metas de ressuscitação volêmica.",
    content: `
      ### O Bundle de 1 Hora
      1. Medir nível de lactato.
      2. Coletar hemoculturas antes dos antibióticos.
      3. Administrar antibióticos de amplo espectro.
      4. Iniciar ressuscitação com cristaloide (30ml/kg).
      5. Iniciar vasopressores se PAM < 65 mmHg.
    `,
    category: "Clínica Médica",
    date: "19 abr 2026",
    readingTime: "12 min",
    author: "Dr. Henrique Lima",
    imageUrl: "/images/sepse.jpg"
  }
];

