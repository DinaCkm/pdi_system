export type RegraRelacaoEixo = "INDIVIDUAL" | "TRANSVERSAL_FIXO";

export type EixoTecnicoOficial = {
  id: string;
  nome: string;
  descricao: string;
  regraRelacao: RegraRelacaoEixo;
};

export type CatalogoEixosTecnicos = {
  unidadeCodigo: string;
  unidadeNome: string;
  versao: string;
  eixos: EixoTecnicoOficial[];
};

export const CATALOGO_UGP_V1: CatalogoEixosTecnicos = {
  unidadeCodigo: "UGP",
  unidadeNome: "UGP - UNIDADE DE GESTÃO DE PESSOAS",
  versao: "UGP-2026-V1",
  eixos: [
    {
      id: "UGP-E01",
      nome: "Legislação Trabalhista, Normas e Conformidade",
      descricao: "Legislação trabalhista e previdenciária, eSocial, relações de trabalho, contratos e conformidade aplicada às rotinas de Gestão de Pessoas.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E02",
      nome: "Ética, Integridade e Responsabilidade",
      descricao: "Princípios éticos, integridade, transparência, responsabilidade institucional e proteção da confiabilidade das informações.",
      regraRelacao: "TRANSVERSAL_FIXO",
    },
    {
      id: "UGP-E03",
      nome: "Gestão de Processos e Governança Documental",
      descricao: "Mapeamento, melhoria, padronização e controle de processos, gestão do conhecimento, registros e documentação institucional.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E04",
      nome: "Comunicação, Atendimento e Relacionamento",
      descricao: "Comunicação clara, escuta, feedback, atendimento, relacionamento e articulação com públicos internos e externos.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E05",
      nome: "Estratégia, Planejamento e Inovação",
      descricao: "Planejamento, priorização, visão sistêmica, tomada de decisão, protagonismo, inovação e gestão orientada a resultados.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E06",
      nome: "Dados, Indicadores e People Analytics",
      descricao: "Análise de dados, indicadores, dashboards, métricas de pessoas, ferramentas analíticas e uso de evidências para decisão.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E07",
      nome: "Gestão de Pessoas e Desempenho",
      descricao: "Subsistemas de Gestão de Pessoas, recrutamento, benefícios, saúde e segurança, desempenho e integração das práticas de RH.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E08",
      nome: "Cultura, Clima, Diversidade e Inclusão",
      descricao: "Cultura organizacional, clima, pertencimento, equidade, diversidade, inclusão e gestão participativa.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E09",
      nome: "Desenvolvimento, Liderança e Capacitação",
      descricao: "Desenvolvimento de pessoas e lideranças, aprendizagem, capacitação, gestão da mudança, coaching, mentoria e desenvolvimento organizacional.",
      regraRelacao: "INDIVIDUAL",
    },
    {
      id: "UGP-E10",
      nome: "Carreira, Sucessão e PDI",
      descricao: "Gestão de carreira, sucessão, identificação e preparação de sucessores e Planos de Desenvolvimento Individual.",
      regraRelacao: "INDIVIDUAL",
    },
  ],
};

export function normalizarNomeEixo(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

function unidadeEhUGP(unidade: unknown) {
  const valor = normalizarNomeEixo(unidade);
  return valor === "ugp" ||
    valor.includes("unidade de gestao de pessoas") ||
    /(^|\s|-)ugp(\s|-|$)/.test(valor);
}

export function catalogoEixosParaUnidade(unidade: unknown): CatalogoEixosTecnicos | null {
  return unidadeEhUGP(unidade) ? CATALOGO_UGP_V1 : null;
}

export function eixoOficialPorNome(unidade: unknown, nome: unknown) {
  const catalogo = catalogoEixosParaUnidade(unidade);
  if (!catalogo) return null;
  const chave = normalizarNomeEixo(nome);
  return catalogo.eixos.find(eixo => normalizarNomeEixo(eixo.nome) === chave) ?? null;
}
