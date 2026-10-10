import { describe, expect, it } from "vitest";
import {
  LEGENDA_MOTIVO,
  LEGENDA_STATUS,
  MOTIVOS,
  STATUS_EVOLUCAO,
  classificarEixo,
  contarMotivos,
  motivoDaLacuna,
  prazoFoiProrrogado,
  situacaoVazia,
  type SituacaoAcoes,
} from "./services/resultadoExecutivoRegras";

const acoes = (parcial: Partial<SituacaoAcoes> = {}): SituacaoAcoes => ({ ...situacaoVazia(), ...parcial });

describe("classificarEixo", () => {
  it("Não essencial é sempre potencialidade, sem meta", () => {
    expect(classificarEixo({ relacao: "NAO_ESSENCIAL", base: 20, atual: 30, acoes: acoes() }).status).toBe("POTENCIALIDADE");
  });

  it("obrigatório sem nenhuma medição fica SEM_MEDICAO", () => {
    expect(classificarEixo({ relacao: "TRANSVERSAL", base: null, atual: null, acoes: acoes() }).status).toBe("SEM_MEDICAO");
  });

  it("tem base mas não tem medição atual", () => {
    expect(classificarEixo({ relacao: "ESSENCIAL", base: 50, atual: null, acoes: acoes() }).status).toBe("SEM_RESULTADO_ATUAL");
  });

  it("domínio x desenvolvido no ciclo", () => {
    expect(classificarEixo({ relacao: "ESSENCIAL", base: 80, atual: 75, acoes: acoes() }).status).toBe("DOMINIO");
    expect(classificarEixo({ relacao: "TRANSVERSAL", base: 60, atual: 70, acoes: acoes() }).status).toBe("DESENVOLVIDO");
    expect(classificarEixo({ relacao: "TRANSVERSAL", base: null, atual: 90, acoes: acoes() }).status).toBe("DESENVOLVIDO");
  });

  it("abaixo da meta com ação aberta está em desenvolvimento", () => {
    const r = classificarEixo({ relacao: "ESSENCIAL", base: 40, atual: 50, acoes: acoes({ abertas: 1 }) });
    expect(r).toEqual({ status: "EM_DESENVOLVIMENTO", precisaNovaAcao: false });
  });

  it("ação concluída depois da medição aguarda nova medição", () => {
    const r = classificarEixo({
      relacao: "ESSENCIAL",
      base: 40,
      atual: 40,
      acoes: acoes({ concluidas: 2, concluidasAntesDaMedicao: 0 }),
    });
    expect(r).toEqual({ status: "AGUARDANDO_NOVA_MEDICAO", precisaNovaAcao: false });
  });

  it("ação concluída antes da medição: com ou sem efeito", () => {
    expect(
      classificarEixo({ relacao: "ESSENCIAL", base: 40, atual: 40, acoes: acoes({ concluidas: 1, concluidasAntesDaMedicao: 1 }) }),
    ).toEqual({ status: "ACAO_SEM_EFEITO", precisaNovaAcao: true });
    expect(
      classificarEixo({ relacao: "ESSENCIAL", base: 40, atual: 55, acoes: acoes({ concluidas: 1, concluidasAntesDaMedicao: 1 }) }),
    ).toEqual({ status: "EM_DESENVOLVIMENTO", precisaNovaAcao: true });
  });

  it("abaixo da meta sem ação é lacuna sem plano", () => {
    expect(classificarEixo({ relacao: "TRANSVERSAL", base: 30, atual: 40, acoes: acoes() }).status).toBe("LACUNA_SEM_PLANO");
  });
});

describe("motivoDaLacuna", () => {
  it("não explica quem está na meta ou é potencialidade", () => {
    expect(motivoDaLacuna("DOMINIO", acoes(), true)).toBeNull();
    expect(motivoDaLacuna("POTENCIALIDADE", acoes(), true)).toBeNull();
  });

  it("ação em andamento: vencida > prorrogada > no prazo", () => {
    expect(motivoDaLacuna("EM_DESENVOLVIMENTO", acoes({ abertas: 1, vencidas: 1, prorrogadas: 1 }), true)).toBe("VENCIDA");
    expect(motivoDaLacuna("EM_DESENVOLVIMENTO", acoes({ abertas: 1, prorrogadas: 1 }), true)).toBe("PRORROGADA");
    expect(motivoDaLacuna("EM_DESENVOLVIMENTO", acoes({ abertas: 1 }), true)).toBe("NO_PRAZO");
  });

  it("ação concluída", () => {
    expect(motivoDaLacuna("AGUARDANDO_NOVA_MEDICAO", acoes({ concluidas: 1 }), true)).toBe("CONCLUIDA_AGUARDANDO_MEDICAO");
    expect(motivoDaLacuna("EM_DESENVOLVIMENTO", acoes({ concluidas: 1, concluidasAntesDaMedicao: 1 }), true)).toBe(
      "CONCLUIDA_EVOLUIU",
    );
    expect(motivoDaLacuna("ACAO_SEM_EFEITO", acoes({ concluidas: 1, concluidasAntesDaMedicao: 1 }), true)).toBe(
      "CONCLUIDA_SEM_EFEITO",
    );
  });

  it("sem ação ativa: sem PDI vem antes de tudo", () => {
    expect(motivoDaLacuna("LACUNA_SEM_PLANO", acoes({ canceladas: 1, solicitacoesReprovadas: 1 }), false)).toBe("SEM_PDI");
  });

  it("sem ação ativa: solicitação em análise, devolvida, reprovada, cancelada, nunca planejada", () => {
    expect(motivoDaLacuna("LACUNA_SEM_PLANO", acoes({ solicitacoesEmAnalise: 1, solicitacoesReprovadas: 1 }), true)).toBe(
      "SOLICITACAO_EM_ANALISE",
    );
    expect(motivoDaLacuna("LACUNA_SEM_PLANO", acoes({ solicitacoesDevolvidas: 1 }), true)).toBe("SOLICITACAO_DEVOLVIDA");
    expect(motivoDaLacuna("LACUNA_SEM_PLANO", acoes({ solicitacoesReprovadas: 1, canceladas: 1 }), true)).toBe(
      "SOLICITACAO_REPROVADA",
    );
    expect(motivoDaLacuna("LACUNA_SEM_PLANO", acoes({ canceladas: 1 }), true)).toBe("ACAO_CANCELADA");
    expect(motivoDaLacuna("LACUNA_SEM_PLANO", acoes(), true)).toBe("NUNCA_PLANEJADA");
  });

  it("sem medição também recebe motivo", () => {
    expect(motivoDaLacuna("SEM_MEDICAO", acoes(), true)).toBe("NUNCA_PLANEJADA");
  });

  it("sem medição atual nunca diz que a ação não teve efeito", () => {
    const concluida = acoes({ concluidas: 1, concluidasAntesDaMedicao: 1 });
    expect(motivoDaLacuna("SEM_RESULTADO_ATUAL", concluida, true)).toBe("CONCLUIDA_AGUARDANDO_MEDICAO");
    expect(motivoDaLacuna("SEM_MEDICAO", concluida, true)).toBe("CONCLUIDA_AGUARDANDO_MEDICAO");
  });
});

describe("apoio", () => {
  it("prorrogação compara datas dd/mm/aaaa", () => {
    expect(prazoFoiProrrogado("31/12/2025", "29/05/2026")).toBe(true);
    expect(prazoFoiProrrogado("01/04/2026", "31/03/2026")).toBe(false);
    expect(prazoFoiProrrogado("", "31/03/2026")).toBe(false);
  });

  it("conta motivos por grupo", () => {
    const r = contarMotivos(["VENCIDA", "NO_PRAZO", "SEM_PDI", null]);
    expect(r.porGrupo).toEqual({ SEM_ACAO_ATIVA: 1, EM_ANDAMENTO: 2, CONCLUIDA: 0 });
    expect(r.porMotivo.VENCIDA).toBe(1);
  });

  it("todo status e todo motivo tem legenda", () => {
    for (const s of STATUS_EVOLUCAO) expect(LEGENDA_STATUS[s].explicacao.length).toBeGreaterThan(10);
    for (const m of MOTIVOS) expect(LEGENDA_MOTIVO[m].explicacao.length).toBeGreaterThan(10);
  });
});
