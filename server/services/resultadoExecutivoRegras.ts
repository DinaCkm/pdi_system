// Resultado Executivo — regras puras (sem banco), usadas por server/routers/evolucaoCiclo.ts.
//
// Duas dimensões, sempre separadas:
//   - TECNICO: eixos da matriz individual; base = prova 2025, atual = prova 2026.
//   - COMPORTAMENTAL: competências da Avaliação de Desempenho (escala 0–3,
//     convertida em % da escala); base = AD anterior, atual = AD mais recente.
//
// Expectativa de desenvolvimento de 70% para Essencial e Transversal. Não essencial não tem expectativa definida: todo
// conhecimento nele é potencialidade. Na dimensão comportamental, "Atuação
// Colaborativa" é transversal (todos); as demais competências da AD avaliadas
// para a pessoa têm meta como Essencial.

export const META_PROFICIENCIA = 70;

// Na Avaliação de Desempenho (nota oficial 0–3) a mesma expectativa de 70% da escala
// corresponde à nota 2,1. A tela mostra o comportamental nessa escala.
export const META_NOTA_AD = 2.1;

export const DIMENSOES = ["TECNICO", "COMPORTAMENTAL"] as const;
export type Dimensao = (typeof DIMENSOES)[number];

export type Relacao = "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | null;

export const STATUS_EVOLUCAO = [
  "DOMINIO", //                 estava na expectativa na base e continua na medição atual
  "DESENVOLVIDO", //            estava abaixo da expectativa e atingiu na medição atual
  "EM_DESENVOLVIMENTO", //      abaixo da expectativa, com ação aberta ou evoluindo
  "AGUARDANDO_NOVA_MEDICAO", // abaixo da expectativa, ação concluída depois da última medição
  "ACAO_SEM_EFEITO", //         abaixo da expectativa, ação concluída antes da medição e nota não subiu
  "LACUNA_SEM_PLANO", //        abaixo da expectativa e sem nenhuma ação no PDI
  "POTENCIALIDADE", //          Não essencial (sem expectativa definida)
  "SEM_RESULTADO_ATUAL", //     tem base, ainda sem a medição atual
  "SEM_MEDICAO", //             obrigatório sem nenhuma medição (nem base nem atual)
  "SEM_CLASSIFICACAO", //       eixo sem relação definida na matriz
] as const;
export type StatusEvolucao = (typeof STATUS_EVOLUCAO)[number];

// Por que existe a lacuna (abaixo da expectativa ou sem medição) — situação das ações.
export const GRUPOS_MOTIVO = ["SEM_ACAO_ATIVA", "EM_ANDAMENTO", "CONCLUIDA"] as const;
export type GrupoMotivo = (typeof GRUPOS_MOTIVO)[number];

export const MOTIVOS = [
  // Sem ação ativa
  "CAIU_DA_EXPECTATIVA",
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
  CAIU_DA_EXPECTATIVA: "SEM_ACAO_ATIVA",
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

  // Abaixo da expectativa na medição atual.
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
  estavaNaExpectativa = false,
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
  // Estava na expectativa na medição anterior: não havia por que planejar ação.
  if (estavaNaExpectativa && status !== "SEM_MEDICAO" && status !== "SEM_RESULTADO_ATUAL") return "CAIU_DA_EXPECTATIVA";
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

// Situação: como a tela agrupa os itens com expectativa (layout aprovado).
export const SITUACOES = [
  "MANTEVE", //            já estava na expectativa e manteve
  "ATINGIU", //            atingiu a meta neste ciclo
  "EM_ANDAMENTO", //       abaixo da expectativa, com ação em andamento
  "CONCLUIU_ABAIXO", //    concluiu a ação, mas ainda abaixo da expectativa
  "SEM_ACAO", //           abaixo da expectativa, sem ação ativa
  "AGUARDANDO_MEDICAO", // ainda sem a medição atual
] as const;
export type Situacao = (typeof SITUACOES)[number];

// Detalhe do "por quê" de cada situação: o motivo das ações, ou um detalhe próprio.
export const DETALHES_SITUACAO = [
  "MANTEVE_COM_FOLGA",
  "MANTEVE_PERTO_DA_META",
  "ATINGIU_COM_ACAO",
  "ATINGIU_SEM_ACAO",
  "SEM_MEDICAO_ATUAL",
  "SEM_NENHUMA_MEDICAO",
] as const;
export type DetalheSituacao = (typeof DETALHES_SITUACAO)[number];
export type Porque = Motivo | DetalheSituacao;

export function situacaoDoItem(item: {
  relacao: Relacao;
  status: StatusEvolucao;
  motivo: Motivo | null;
}): Situacao | null {
  if (!comMeta(item.relacao)) return null;
  if (item.status === "DOMINIO") return "MANTEVE";
  if (item.status === "DESENVOLVIDO") return "ATINGIU";
  if (item.status === "SEM_RESULTADO_ATUAL" || item.status === "SEM_MEDICAO") return "AGUARDANDO_MEDICAO";
  if (item.status === "SEM_CLASSIFICACAO" || !item.motivo) return null;
  const grupo = GRUPO_DO_MOTIVO[item.motivo];
  if (grupo === "EM_ANDAMENTO") return "EM_ANDAMENTO";
  if (grupo === "CONCLUIDA") return "CONCLUIU_ABAIXO";
  return "SEM_ACAO";
}

export function porqueDoItem(item: {
  situacao: Situacao | null;
  status: StatusEvolucao;
  atual: number | null;
  motivo: Motivo | null;
  acoes: Pick<SituacaoAcoes, "concluidasAntesDaMedicao">;
}): Porque | null {
  switch (item.situacao) {
    case "MANTEVE":
      return item.atual !== null && item.atual >= 80 ? "MANTEVE_COM_FOLGA" : "MANTEVE_PERTO_DA_META";
    case "ATINGIU":
      return item.acoes.concluidasAntesDaMedicao > 0 ? "ATINGIU_COM_ACAO" : "ATINGIU_SEM_ACAO";
    case "AGUARDANDO_MEDICAO":
      return item.status === "SEM_MEDICAO" ? "SEM_NENHUMA_MEDICAO" : "SEM_MEDICAO_ATUAL";
    case null:
      return null;
    default:
      return item.motivo;
  }
}

export const LEGENDA_SITUACAO: Record<Situacao, { nome: string; regra: string; significa: string; recomenda: string }> = {
  MANTEVE: {
    nome: "Já estava na expectativa e manteve",
    regra: "Estava com 70% ou mais na medição anterior e continuou na medição atual.",
    significa: "Ponto forte consolidado. Não precisa de ação de desenvolvimento neste ciclo.",
    recomenda: "Usar essas pessoas como multiplicadoras ou mentoras para colegas abaixo da expectativa no mesmo ponto.",
  },
  ATINGIU: {
    nome: "Atingiu a expectativa neste ciclo",
    regra: "Estava abaixo de 70% (ou sem medição) e chegou a 70% ou mais na medição atual.",
    significa: "É o resultado direto do ciclo: ponto que era lacuna e foi desenvolvido.",
    recomenda: "Reconhecer e registrar como caso de sucesso. Verificar quais ações do PDI funcionaram para replicar.",
  },
  EM_ANDAMENTO: {
    nome: "Abaixo da expectativa, com ação em andamento",
    regra: "Ainda abaixo de 70%, mas existe ação do PDI ativa para o ponto.",
    significa: "O ponto está sendo tratado. O resultado deve aparecer na próxima medição.",
    recomenda: "Acompanhar o prazo. Ações vencidas precisam de cobrança do líder; prorrogadas, de confirmação da nova data.",
  },
  CONCLUIU_ABAIXO: {
    nome: "Concluiu a ação, mas ainda abaixo da expectativa",
    regra: "A ação do PDI foi concluída, mas o resultado da medição atual ficou abaixo de 70%.",
    significa: "Se a ação foi feita depois da medição, o efeito só aparece na próxima. Se foi antes, o esforço não bastou para chegar à expectativa.",
    recomenda: "Aguardar a próxima medição quando a ação foi recente. Nos demais casos, rever o tipo de ação ou acrescentar uma segunda no próximo PDI.",
  },
  SEM_ACAO: {
    nome: "Abaixo da expectativa, sem ação ativa",
    regra: "Está abaixo de 70% e hoje não existe nenhuma ação do PDI ativa para o ponto.",
    significa: "Ponto que precisa de desenvolvimento e não está sendo trabalhado. O motivo mostra por que ficou sem ação.",
    recomenda: "Incluir uma ação no próximo PDI. Em ação cancelada ou reprovada, o líder precisa registrar a nova ação.",
  },
  AGUARDANDO_MEDICAO: {
    nome: "Ainda sem medição atual",
    regra: "Eixo ou competência com expectativa que ainda não tem o resultado da medição atual.",
    significa: "Não é possível dizer se evoluiu: falta a prova 2026 (técnico) ou a Avaliação de Desempenho mais recente (comportamental).",
    recomenda: "Concluir a aplicação da prova nas unidades pendentes antes de publicar o Resultado Executivo.",
  },
};

export const LEGENDA_DETALHE_SITUACAO: Record<DetalheSituacao, { titulo: string; fonte: string }> = {
  MANTEVE_COM_FOLGA: {
    titulo: "Manteve com folga (80% ou mais; na AD, nota 2,4 ou mais)",
    fonte: "Resultado da medição atual",
  },
  MANTEVE_PERTO_DA_META: {
    titulo: "Manteve perto da expectativa (70% a 79%; na AD, nota 2,1 a 2,39)",
    fonte: "Atenção: pode cair no próximo ciclo",
  },
  ATINGIU_COM_ACAO: { titulo: "Com ação do PDI concluída no ponto", fonte: "Ações do PDI com status Concluída" },
  ATINGIU_SEM_ACAO: { titulo: "Sem ação do PDI concluída antes da medição", fonte: "Evoluiu por outra via" },
  SEM_MEDICAO_ATUAL: { titulo: "Tem medição anterior, falta a atual", fonte: "Prova 2026 ou AD mais recente ainda não registrada" },
  SEM_NENHUMA_MEDICAO: { titulo: "Sem nenhuma medição", fonte: "Sem nota na medição anterior nem na atual" },
};

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
    explicacao: "Já estava na expectativa (70%) na medição anterior e se manteve nela na medição atual.",
  },
  DESENVOLVIDO: {
    titulo: "Desenvolvido no ciclo",
    explicacao: "Estava abaixo da expectativa na medição anterior (ou não tinha medição) e atingiu 70% na medição atual.",
  },
  EM_DESENVOLVIMENTO: {
    titulo: "Em desenvolvimento",
    explicacao: "Abaixo da expectativa, com ação do PDI em andamento ou com evolução após ação concluída.",
  },
  AGUARDANDO_NOVA_MEDICAO: {
    titulo: "Aguardando nova medição",
    explicacao: "Abaixo da expectativa na última medição, mas as ações foram feitas depois dela. O efeito aparece na próxima medição.",
  },
  ACAO_SEM_EFEITO: {
    titulo: "Ação sem efeito",
    explicacao: "Abaixo da expectativa, a ação foi concluída antes da medição e o resultado não subiu. Precisa de nova ação.",
  },
  LACUNA_SEM_PLANO: {
    titulo: "Lacuna sem plano",
    explicacao: "Abaixo da expectativa e sem nenhuma ação no PDI para este eixo/competência.",
  },
  POTENCIALIDADE: {
    titulo: "Potencialidade",
    explicacao: "Eixo Não essencial para a função: não tem expectativa definida; todo conhecimento nele é potencialidade.",
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
  CAIU_DA_EXPECTATIVA: {
    titulo: "Estava na expectativa e caiu",
    explicacao: "Na medição anterior já alcançava a expectativa, então não havia por que planejar ação. Passa a ser ponto do próximo PDI.",
  },
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
    explicacao: "A ação foi concluída antes da medição e o resultado subiu, mas ainda não chegou à expectativa.",
  },
  CONCLUIDA_SEM_EFEITO: {
    titulo: "Concluída sem efeito",
    explicacao: "A ação foi concluída antes da medição e o resultado continuou abaixo da expectativa.",
  },
};

export const LEGENDA_GRUPO_MOTIVO: Record<GrupoMotivo, string> = {
  SEM_ACAO_ATIVA: "Sem ação ativa",
  EM_ANDAMENTO: "Ação em andamento",
  CONCLUIDA: "Ação concluída",
};

export const LEGENDA_INDICADOR = {
  pessoas: "Empregados ativos com pelo menos um eixo/competência neste recorte.",
  itensComMeta: "Eixos/competências Essenciais e Transversais (com expectativa de 70%), contando uma vez por pessoa.",
  media: "Média do resultado nos itens com expectativa: % de acerto na prova (técnico) ou nota de 0 a 3 na Avaliação de Desempenho (comportamental).",
  indiceEvolucaoPp: "Média da diferença, em pontos percentuais, entre a medição atual e a anterior, só onde existem as duas.",
  percentualNaMeta:
    "Dos itens com expectativa que têm medição, quantos a alcançam: 70% de acerto (técnico) ou nota 2,1 (comportamental).",
  efetividade:
    "Compara a evolução de quem concluiu ação do PDI antes da medição com a de quem não teve ação. Ações feitas depois da medição não entram.",
  potencialidades: "Eixos Não essenciais (sem expectativa definida). 'Acima de 70%' mostra conhecimento além do exigido pela função.",
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
    escala: "Nota oficial da Avaliação de Desempenho, de 0 a 3. Expectativa de desenvolvimento: nota 2,1 (70% da escala).",
  },
};
