// Leitura da planilha do ciclo 2025 do PDI ("Relatório - Ciclo 2025 Finalizado e Revisado").
// O PDI 2025 foi conduzido fora da plataforma; esta planilha é a única fonte.
// Abas usadas: "PDI", "Áreas de desenvolvimento", "Ações Finalizadas" e "Ações Não Finalizadas".
// Recebe as linhas de cada aba como matrizes (primeira linha = cabeçalho) e devolve
// registros normalizados, sem os textos longos de orientação das ações.

export type TipoArea2025 = "COMPORTAMENTAL" | "TECNICA";

export type Resumo2025 = {
  email: string;
  nome: string;
  time: string | null;
  lider: string | null;
  aprovadoLider: string | null;
  totalAreas: number | null;
  naoIniciadas: number | null;
  emProgresso: number | null;
  finalizadas: number | null;
  pdiFinalizado: string | null;
  atualizadoEm: string | null;
};

export type Area2025 = {
  email: string;
  area: string;
  tipo: TipoArea2025 | null;
  competencia: string | null;
  categoria: string | null;
  criadoEm: string | null;
  atualizadoEm: string | null;
  progresso: string | null;
  totalAcoes: number | null;
  finalizadas: number | null;
};

export type Acao2025 = {
  email: string;
  area: string | null;
  tipo: TipoArea2025 | null;
  competencia: string | null;
  acao: string;
  tipoAcao: string | null;
  prazo: string | null;
  concluidoEm: string | null;
  finalizada: boolean;
};

export type Planilha2025 = { resumos: Resumo2025[]; areas: Area2025[]; acoes: Acao2025[]; semEmail: string[] };

type Linhas = unknown[][];

const ABAS = {
  pdi: "PDI",
  areas: "Áreas de desenvolvimento",
  finalizadas: "Ações Finalizadas",
  pendentes: "Ações Não Finalizadas",
} as const;

export const ABAS_PLANILHA_2025 = Object.values(ABAS);

export function texto(v: unknown): string {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function textoOuNulo(v: unknown, max = 255): string | null {
  const t = texto(v);
  return t ? t.slice(0, max) : null;
}

function numero(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Datas chegam como texto "aaaa-mm-dd", como Date ou como número serial do Excel.
export function data(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && Number.isFinite(v)) {
    const ms = Math.round((v - 25569) * 864e5);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const t = texto(v);
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
}

export function nomeArea(v: unknown): string {
  return texto(v).replace(/^macro\s*[áa]rea(\s+do\s+comportamento)?\s*:\s*/i, "").trim();
}

export function tipoPelaDescricao(v: unknown): TipoArea2025 | null {
  const t = texto(v).toLowerCase();
  if (t.includes("comportamental")) return "COMPORTAMENTAL";
  if (t.includes("técnica") || t.includes("tecnica")) return "TECNICA";
  return null;
}

function competencia(v: unknown): string | null {
  const m = String(v ?? "").replace(/\n/g, " | ").match(/Compet[êe]ncia (?:Comportamental|T[ée]cnica)\s*:\s*([^|\]\[]+)/i);
  const t = m ? texto(m[1]) : "";
  return t ? t.slice(0, 200) : null;
}

function indice(cab: unknown[], ...nomes: string[]): number {
  const norm = (s: unknown) => texto(s).toLowerCase();
  for (const n of nomes) {
    const i = cab.findIndex((c) => norm(c) === n.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

const pega = (linha: unknown[], i: number) => (i >= 0 ? linha[i] : undefined);

export function lerPlanilha2025(abas: Record<string, Linhas | undefined>): Planilha2025 {
  const faltando = ABAS_PLANILHA_2025.filter((a) => !abas[a]);
  if (faltando.length) throw new Error(`Planilha sem as abas: ${faltando.join(", ")}.`);

  const resumos: Resumo2025[] = [];
  {
    const [cab, ...linhas] = abas[ABAS.pdi]!;
    const c = {
      nome: indice(cab, "Nome"),
      email: indice(cab, "Email"),
      time: indice(cab, "Times"),
      lider: indice(cab, "Líder"),
      aprovado: indice(cab, "Aprovado pelo líder?"),
      total: indice(cab, "Total de Áreas de desenvolvimento"),
      atualizado: indice(cab, "Atualizado em (yyyy-mm-dd)"),
      nao: indice(cab, "Não iniciada"),
      prog: indice(cab, "Em progresso"),
      fin: indice(cab, "Finalizada"),
      pdiFin: indice(cab, "PDI Finalizado?"),
    };
    for (const l of linhas) {
      const email = texto(pega(l, c.email)).toLowerCase();
      if (!email) continue;
      resumos.push({
        email,
        nome: texto(pega(l, c.nome)),
        time: textoOuNulo(pega(l, c.time)),
        lider: textoOuNulo(pega(l, c.lider)),
        aprovadoLider: textoOuNulo(pega(l, c.aprovado), 20),
        totalAreas: numero(pega(l, c.total)),
        naoIniciadas: numero(pega(l, c.nao)),
        emProgresso: numero(pega(l, c.prog)),
        finalizadas: numero(pega(l, c.fin)),
        pdiFinalizado: textoOuNulo(pega(l, c.pdiFin), 40),
        atualizadoEm: data(pega(l, c.atualizado)),
      });
    }
  }

  const areas: Area2025[] = [];
  const tipoDaArea = new Map<string, TipoArea2025>();
  {
    const [cab, ...linhas] = abas[ABAS.areas]!;
    const c = {
      email: indice(cab, "Email"),
      area: indice(cab, "Área de desenvolvimento"),
      desc: indice(cab, "Descrição"),
      cat: indice(cab, "Categoria"),
      criado: indice(cab, "Criado em (yyyy-mm-dd)"),
      atualizado: indice(cab, "Atualizado em (yyyy-mm-dd)"),
      progresso: indice(cab, "Progresso"),
      total: indice(cab, "Total de ações"),
      fin: indice(cab, "Finalizada"),
    };
    for (const l of linhas) {
      const email = texto(pega(l, c.email)).toLowerCase();
      const area = nomeArea(pega(l, c.area));
      if (!email || !area) continue;
      const tipo = tipoPelaDescricao(pega(l, c.desc));
      if (tipo) tipoDaArea.set(`${email}|${area.toLowerCase()}`, tipo);
      areas.push({
        email,
        area: area.slice(0, 255),
        tipo,
        competencia: competencia(pega(l, c.desc)),
        categoria: textoOuNulo(pega(l, c.cat), 60),
        criadoEm: data(pega(l, c.criado)),
        atualizadoEm: data(pega(l, c.atualizado)),
        progresso: textoOuNulo(pega(l, c.progresso), 40),
        totalAcoes: numero(pega(l, c.total)),
        finalizadas: numero(pega(l, c.fin)),
      });
    }
  }

  const acoes: Acao2025[] = [];
  {
    const [cab, ...linhas] = abas[ABAS.finalizadas]!;
    // A aba tem duas colunas "Descrição" e duas "Categoria": a primeira é da área, a segunda da ação.
    const c = {
      email: indice(cab, "Email"),
      area: indice(cab, "Área de desenvolvimento"),
      padrao: indice(cab, "Padronização"),
      descArea: indice(cab, "Descrição"),
      acao: indice(cab, "Ação"),
      catAcao: cab.findIndex((h, i) => texto(h) === "Categoria" && i > indice(cab, "Ação")),
      prazo: indice(cab, "Data de entrega (yyyy-mm-dd)"),
      concluido: indice(cab, "Concluído em (yyyy-mm-dd)"),
    };
    for (const l of linhas) {
      const email = texto(pega(l, c.email)).toLowerCase();
      const acao = texto(pega(l, c.acao)).replace(/^A[ÇC][ÃA]O\s*:\s*/i, "");
      if (!email || !acao) continue;
      const area = nomeArea(pega(l, c.padrao) || pega(l, c.area)) || null;
      acoes.push({
        email,
        area: area ? area.slice(0, 255) : null,
        tipo: tipoPelaDescricao(pega(l, c.descArea)) ?? (area ? tipoDaArea.get(`${email}|${area.toLowerCase()}`) ?? null : null),
        competencia: competencia(pega(l, c.descArea)),
        acao: acao.slice(0, 400),
        tipoAcao: textoOuNulo(pega(l, c.catAcao), 100),
        prazo: data(pega(l, c.prazo)),
        concluidoEm: data(pega(l, c.concluido)),
        finalizada: true,
      });
    }
  }

  const semEmail: string[] = [];
  {
    const emailPorNome = new Map(resumos.map((r) => [r.nome.toLowerCase(), r.email]));
    const [cab, ...linhas] = abas[ABAS.pendentes]!;
    const c = { nome: indice(cab, "Nome"), padrao: indice(cab, "Padronização"), acao: indice(cab, "Ação") };
    for (const l of linhas) {
      const nome = texto(pega(l, c.nome));
      const acao = texto(pega(l, c.acao));
      if (!nome || !acao) continue;
      const email = emailPorNome.get(nome.toLowerCase());
      if (!email) {
        semEmail.push(nome);
        continue;
      }
      const area = nomeArea(pega(l, c.padrao)) || null;
      acoes.push({
        email,
        area: area ? area.slice(0, 255) : null,
        tipo: area ? tipoDaArea.get(`${email}|${area.toLowerCase()}`) ?? null : null,
        competencia: null,
        acao: acao.slice(0, 400),
        tipoAcao: null,
        prazo: null,
        concluidoEm: null,
        finalizada: false,
      });
    }
  }

  return { resumos, areas, acoes, semEmail: Array.from(new Set(semEmail)) };
}
