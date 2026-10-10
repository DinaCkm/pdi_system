// Resultado Executivo — regras puras (sem banco), usadas por server/routers/evolucaoCiclo.ts.
//
// Duas dimensões, sempre separadas:
//   - TECNICO: eixos da matriz individual; base = prova 2025, atual = prova 2026.
//   - COMPORTAMENTAL: competências da Avaliação de Desempenho (escala 0–3,
//     convertida em % da escala); base = AD anterior, atual = AD mais recente.
//
// Meta de 70% para Essencial e Transversal. Não essencial não tem meta: todo
// conhecimento nele é potencialidade. Na dimensão comportamental, "Atuação
// Colaborativa" é transversal (todos); as demais competências da AD avaliadas
// para a pessoa têm meta como Essencial.

export const META_PROFICIENCIA = 70;

export const DIMENSOES = ["TECNICO", "COMPORTAMENTAL"] as const;
export type Dimensao = (typeof DIMENSOES)[number];

export type Relacao = "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | null;

export const STATUS_EVOLUCAO = [
  "DOMINIO", //                 estava na meta na base e continua na medição atual
  "DESENVOLVIDO", //            estava abaixo da meta e atingiu na medição atual
  "EM_DESENVOLVIMENTO", //      abaixo da meta, com ação aberta ou evoluindo
  "AGUARDANDO_NOVA_MEDICAO", // abaixo da meta, ação concluída depois da última medição
  "ACAO_SEM_EFEITO", //         abaixo da meta, ação concluída antes da medição e nota não subiu
  "LACUNA_SEM_PLANO", //        abaixo da meta e sem nenhuma ação no PDI
  "POTENCIALIDADE", //          Não essencial (sem meta)
  "SEM_RESULTADO_ATUAL", //     tem base, ainda sem a medição atual
  "SEM_MEDICAO", //             obrigatório sem nenhuma medição (nem base nem atual)
  "SEM_CLASSIFICACAO", //       eixo sem relação definida na matriz
] as const;
export type StatusEvolucao = (typeof STATUS_EVOLUCAO)[number];

// Por que existe a lacuna (abaixo da meta ou sem medição) — situação das ações.
export const GRUPOS_MOTIVO = ["SEM_ACAO_ATIVA", "EM_ANDAMENTO", "CONCLUIDA"] as const;
export type GrupoMotivo = (typeof GRUPOS_MOTIVO)[number];

export const MOTIVOS = [
  // Sem ação ativa
  "SEM_PDI",
  "NUNCA_PLANEJADA",
  "ACAO_CANCELADA",
  "SOLICITACAO_REPROVADA",
  "SOLICITACAO_DEVOLVIDA",
  "SOLICITACAO_EM_ANALISE",
  // Em andamento
  "NO_PRAZO",
  "PRORROGADA",
  "VENCIDA",
  // Concluída
  "CONCLUIDA_AGUARDANDO_MEDICAO",
  "CONCLUIDA_EVOLUIU",
  "CONCLUIDA_SEM_EFEITO",
] as const;
export type Motivo = (typeof MOTIVOS)[number];

export const GRUPO_DO_MOTIVO: Record<Motivo, GrupoMotivo> = {
  SEM_PDI: "SEM_ACAO_ATIVA",
  NUNCA_PLANEJADA: "SEM_ACAO_ATIVA",
  ACAO_CANCELADA: "SEM_ACAO_ATIVA",
  SOLICITACAO_REPROVADA: "SEM_ACAO_ATIVA",
  SOLICITACAO_DEVOLVIDA: "SEM_ACAO_ATIVA",
  SOLICITACAO_EM_ANALISE: "SEM_ACAO_ATIVA",
  NO_PRAZO: "EM_ANDAMENTO",
  PRORROGADA: "EM_ANDAMENTO",
  VENCIDA: "EM_ANDAMENTO",
  CONCLUIDA_AGUARDANDO_MEDICAO: "CONCLUIDA",
  CONCLUIDA_EVOLUIU: "CONCLUIDA",
  CONCLUIDA_SEM_EFEITO: "CONCLUIDA",
};

// Situação das ações (e solicitações) ligadas a um eixo/competência de uma pessoa.
export type SituacaoAcoes = {
  total: number; //                     ações não canceladas
  concluidas: number;
  concluidasAntesDaMedicao: number; //  concluídas em ciclo iniciado antes da medição atual
  abertas: number;
  vencidas: number; //                  abertas com prazo já passado
  prorrogadas: number; //               abertas cujo prazo foi estendido
  evidenciaDevolvida: number; //        abertas com evidência reprovada
  canceladas: number;
  solicitacoesReprovadas: number; //    vetada pelo gestor/RH ou encerrada pelo líder
  solicitacoesDevolvidas: number; //    devolvidas ao solicitante para ajuste
  solicitacoesEmAnalise: number; //     aguardando CKM, gestor ou RH
};

export function situacaoVazia(): SituacaoAcoes {
  return {
    total: 0,
    concluidas: 0,
    concluidasAntesDaMedicao: 0,
    abertas: 0,
    vencidas: 0,
    prorrogadas: 0,
    evidenciaDevolvida: 0,
    canceladas: 0,
    solicitacoesReprovadas: 0,
    solicitacoesDevolvidas: 0,
    solicitacoesEmAnalise: 0,
  };
}

export function comMeta(relacao: Relacao) {
  return relacao === "ESSENCIAL" || relacao === "TRANSVERSAL";
}

export function classificarEixo(item: {
  relacao: Relacao;
  base: number | null;
  atual: number | null;
  acoes: Pick<SituacaoAcoes, "abertas" | "concluidas" | "concluidasAntesDaMedicao">;
}): { status: StatusEvolucao; precisaNovaAcao: boolean } {
  if (!item.relacao) return { status: "SEM_CLASSIFICACAO", precisaNovaAcao: false };
  if (item.relacao === "NAO_ESSENCIAL") return { status: "POTENCIALIDADE", precisaNovaAcao: false };
  if (item.atual === null && item.base === null) return { status: "SEM_MEDICAO", precisaNovaAcao: false };
  if (item.atual === null) return { status: "SEM_RESULTADO_ATUAL", precisaNovaAcao: false };

  if (item.atual >= META_PROFICIENCIA) {
    const jaNaMeta = item.base !== null && item.base >= META_PROFICIENCIA;
    return { status: jaNaMeta ? "DOMINIO" : "DESENVOLVIDO", precisaNovaAcao: false };
  }

  // Abaixo da meta na medição atual.
  if (item.acoes.abertas > 0) return { status: "EM_DESENVOLVIMENTO", precisaNovaAcao: false };
  if (item.acoes.concluidas > 0) {
    // Ação concluída depois da medição ainda não pode ter efeito nela.
    if (item.acoes.concluidasAntesDaMedicao === 0) {
      return { status: "AGUARDANDO_NOVA_MEDICAO", precisaNovaAcao: false };
    }
    const evoluiu = item.base !== null && item.atual > item.base;
    return evoluiu
      ? { status: "EM_DESENVOLVIMENTO", precisaNovaAcao: true }
      : { status: "ACAO_SEM_EFEITO", precisaNovaAcao: true };
  }
  return { status: "LACUNA_SEM_PLANO", precisaNovaAcao: true };
}

// Status que representam lacuna e por isso precisam de um "por quê".
const STATUS_COM_MOTIVO = new Set<StatusEvolucao>([
  "EM_DESENVOLVIMENTO",
  "AGUARDANDO_NOVA_MEDICAO",
  "ACAO_SEM_EFEITO",
  "LACUNA_SEM_PLANO",
  "SEM_MEDICAO",
  "SEM_RESULTADO_ATUAL",
]);

export function motivoDaLacuna(
  status: StatusEvolucao,
  acoes: SituacaoAcoes,
  temPdi: boolean,
): Motivo | null {
  if (!STATUS_COM_MOTIVO.has(status)) return null;

  if (acoes.abertas > 0) {
    if (acoes.vencidas > 0) return "VENCIDA";
    if (acoes.prorrogadas > 0) return "PRORROGADA";
    return "NO_PRAZO";
  }
  if (acoes.concluidas > 0) {
    // Só dá para falar em efeito quando há medição atual posterior à ação.
    if (status === "ACAO_SEM_EFEITO") return "CONCLUIDA_SEM_EFEITO";
    if (status === "EM_DESENVOLVIMENTO") return "CONCLUIDA_EVOLUIU";
    return "CONCLUIDA_AGUARDANDO_MEDICAO";
  }
  if (!temPdi) return "SEM_PDI";
  if (acoes.solicitacoesEmAnalise > 0) return "SOLICITACAO_EM_ANALISE";
  if (acoes.solicitacoesDevolvidas > 0) return "SOLICITACAO_DEVOLVIDA";
  if (acoes.solicitacoesReprovadas > 0) return "SOLICITACAO_REPROVADA";
  if (acoes.canceladas > 0) return "ACAO_CANCELADA";
  return "NUNCA_PLANEJADA";
}

export function contarMotivos(motivos: Array<Motivo | null>) {
  const porMotivo = Object.fromEntries(MOTIVOS.map((m) => [m, 0])) as Record<Motivo, number>;
  const porGrupo = Object.fromEntries(GRUPOS_MOTIVO.map((g) => [g, 0])) as Record<GrupoMotivo, number>;
  for (const m of motivos) {
    if (!m) continue;
    porMotivo[m] += 1;
    porGrupo[GRUPO_DO_MOTIVO[m]] += 1;
  }
  return { porGrupo, porMotivo };
}

// Prazo estendido: o histórico grava as datas como dd/mm/aaaa.
export function prazoFoiProrrogado(valorAnterior: unknown, valorNovo: unknown) {
  const paraNumero = (v: unknown) => {
    const m = String(v ?? "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return m ? Number(`${m[3]}${m[2]}${m[1]}`) : null;
  };
  const antes = paraNumero(valorAnterior);
  const depois = paraNumero(valorNovo);
  return antes !== null && depois !== null && depois > antes;
}

// Textos para legendas e tooltips: cada número do painel precisa de explicação.
export const LEGENDA_STATUS: Record<StatusEvolucao, { titulo: string; explicacao: string }> = {
  DOMINIO: {
    titulo: "Domínio",
    explicacao: "Já estava na meta (70%) na medição anterior e se manteve na meta na medição atual.",
  },
  DESENVOLVIDO: {
    titulo: "Desenvolvido no ciclo",
    explicacao: "Estava abaixo da meta na medição anterior (ou não tinha medição) e atingiu 70% na medição atual.",
  },
  EM_DESENVOLVIMENTO: {
    titulo: "Em desenvolvimento",
    explicacao: "Abaixo da meta, com ação do PDI em andamento ou com evolução após ação concluída.",
  },
  AGUARDANDO_NOVA_MEDICAO: {
    titulo: "Aguardando nova medição",
    explicacao: "Abaixo da meta na última medição, mas as ações foram feitas depois dela. O efeito aparece na próxima medição.",
  },
  ACAO_SEM_EFEITO: {
    titulo: "Ação sem efeito",
    explicacao: "Abaixo da meta, a ação foi concluída antes da medição e o resultado não subiu. Precisa de nova ação.",
  },
  LACUNA_SEM_PLANO: {
    titulo: "Lacuna sem plano",
    explicacao: "Abaixo da meta e sem nenhuma ação no PDI para este eixo/competência.",
  },
  POTENCIALIDADE: {
    titulo: "Potencialidade",
    explicacao: "Eixo Não essencial para a função: não tem meta; todo conhecimento nele é potencialidade.",
  },
  SEM_RESULTADO_ATUAL: {
    titulo: "Sem resultado atual",
    explicacao: "Tem medição anterior, mas ainda não tem a medição atual (prova 2026 ou Avaliação de Desempenho mais recente).",
  },
  SEM_MEDICAO: {
    titulo: "Sem medição",
    explicacao: "Obrigatório para a pessoa, mas não foi medido nem na medição anterior nem na atual.",
  },
  SEM_CLASSIFICACAO: {
    titulo: "Sem classificação",
    explicacao: "Eixo sem relação definida na matriz (Essencial, Transversal ou Não essencial).",
  },
};

export const LEGENDA_MOTIVO: Record<Motivo, { titulo: string; explicacao: string }> = {
  SEM_PDI: { titulo: "Sem PDI", explicacao: "A pessoa não tem PDI ativo no ciclo." },
  NUNCA_PLANEJADA: {
    titulo: "Nunca planejada",
    explicacao: "Tem PDI, mas nenhuma ação nem solicitação foi registrada para este eixo/competência.",
  },
  ACAO_CANCELADA: { titulo: "Ação cancelada", explicacao: "A única ação planejada para este eixo/competência foi cancelada." },
  SOLICITACAO_REPROVADA: {
    titulo: "Solicitação reprovada",
    explicacao: "A ação foi solicitada, mas vetada pelo gestor ou RH, ou encerrada pelo líder.",
  },
  SOLICITACAO_DEVOLVIDA: {
    titulo: "Solicitação devolvida",
    explicacao: "A solicitação de ação foi devolvida ao empregado para ajuste e ainda não voltou.",
  },
  SOLICITACAO_EM_ANALISE: {
    titulo: "Solicitação em análise",
    explicacao: "Há solicitação de ação aguardando parecer da CKM, do gestor ou do RH.",
  },
  NO_PRAZO: { titulo: "Ação no prazo", explicacao: "Há ação em andamento dentro do prazo." },
  PRORROGADA: { titulo: "Ação prorrogada", explicacao: "Há ação em andamento cujo prazo foi estendido." },
  VENCIDA: { titulo: "Ação vencida", explicacao: "Há ação em aberto com prazo já vencido." },
  CONCLUIDA_AGUARDANDO_MEDICAO: {
    titulo: "Concluída, aguardando medição",
    explicacao: "A ação foi concluída, mas ainda não há medição posterior a ela; o efeito será visto na próxima medição.",
  },
  CONCLUIDA_EVOLUIU: {
    titulo: "Concluída, evoluiu",
    explicacao: "A ação foi concluída antes da medição e o resultado subiu, mas ainda não chegou à meta.",
  },
  CONCLUIDA_SEM_EFEITO: {
    titulo: "Concluída sem efeito",
    explicacao: "A ação foi concluída antes da medição e o resultado continuou abaixo da meta.",
  },
};

export const LEGENDA_GRUPO_MOTIVO: Record<GrupoMotivo, string> = {
  SEM_ACAO_ATIVA: "Sem ação ativa",
  EM_ANDAMENTO: "Ação em andamento",
  CONCLUIDA: "Ação concluída",
};

export const LEGENDA_INDICADOR = {
  pessoas: "Empregados ativos com pelo menos um eixo/competência neste recorte.",
  itensComMeta: "Eixos/competências Essenciais e Transversais (com meta de 70%), contando uma vez por pessoa.",
  media: "Média do resultado (% de acerto na prova, ou % da escala 0–3 na Avaliação de Desempenho) nos itens com meta.",
  indiceEvolucaoPp: "Média da diferença, em pontos percentuais, entre a medição atual e a anterior, só onde existem as duas.",
  percentualNaMeta: "Dos itens com meta que têm medição, quantos estão em 70% ou mais.",
  efetividade:
    "Compara a evolução de quem concluiu ação do PDI antes da medição com a de quem não teve ação. Ações feitas depois da medição não entram.",
  potencialidades: "Eixos Não essenciais (sem meta). 'Acima de 70%' mostra conhecimento além do exigido pela função.",
  motivos: "Por que cada lacuna existe: situação das ações e solicitações do PDI para aquele eixo/competência.",
} as const;

export const DESCRICAO_DIMENSAO: Record<Dimensao, { titulo: string; base: string; atual: string; escala: string }> = {
  TECNICO: {
    titulo: "Técnico",
    base: "Prova 2025 (linha de base da matriz)",
    atual: "Prova de certificação 2026",
    escala: "Percentual de acerto por eixo.",
  },
  COMPORTAMENTAL: {
    titulo: "Comportamental",
    base: "Avaliação de Desempenho anterior",
    atual: "Avaliação de Desempenho mais recente",
    escala: "Nota oficial 0–3 convertida em % da escala (70% ≈ nota 2,1).",
  },
};
