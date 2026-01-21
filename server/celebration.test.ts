import { describe, it, expect } from "vitest";

describe("Celebração de Conclusão", () => {
  it("deve detectar mudança de status de aguardando_avaliacao para concluida", () => {
    // Simular ação anterior
    const acaoAnterior = {
      id: 1,
      titulo: "Aprender React",
      status: "aguardando_avaliacao",
    };

    // Simular ação atualizada
    const acaoAtualizada = {
      id: 1,
      titulo: "Aprender React",
      status: "concluida",
    };

    // Lógica de detecção
    const mudouParaConcluida =
      acaoAnterior.status === "aguardando_avaliacao" &&
      acaoAtualizada.status === "concluida";

    expect(mudouParaConcluida).toBe(true);
  });

  it("não deve disparar celebração se status não mudou", () => {
    const acaoAnterior = {
      id: 1,
      titulo: "Aprender React",
      status: "concluida",
    };

    const acaoAtualizada = {
      id: 1,
      titulo: "Aprender React",
      status: "concluida",
    };

    const mudouParaConcluida =
      acaoAnterior.status === "aguardando_avaliacao" &&
      acaoAtualizada.status === "concluida";

    expect(mudouParaConcluida).toBe(false);
  });

  it("não deve disparar celebração se mudou para outro status", () => {
    const acaoAnterior = {
      id: 1,
      titulo: "Aprender React",
      status: "aguardando_avaliacao",
    };

    const acaoAtualizada = {
      id: 1,
      titulo: "Aprender React",
      status: "em_andamento",
    };

    const mudouParaConcluida =
      acaoAnterior.status === "aguardando_avaliacao" &&
      acaoAtualizada.status === "concluida";

    expect(mudouParaConcluida).toBe(false);
  });

  it("deve encontrar ação concluída em lista de ações", () => {
    const minhasAcoes = [
      { id: 1, titulo: "Ação 1", status: "em_andamento" },
      { id: 2, titulo: "Ação 2", status: "concluida" },
      { id: 3, titulo: "Ação 3", status: "aguardando_avaliacao" },
    ];

    const previousAcoes = [
      { id: 1, titulo: "Ação 1", status: "em_andamento" },
      { id: 2, titulo: "Ação 2", status: "aguardando_avaliacao" },
      { id: 3, titulo: "Ação 3", status: "aguardando_avaliacao" },
    ];

    const acaoConcluida = minhasAcoes.find((acao) => {
      const acaoAnterior = previousAcoes.find((prev) => prev.id === acao.id);
      return (
        acaoAnterior?.status === "aguardando_avaliacao" &&
        acao.status === "concluida"
      );
    });

    expect(acaoConcluida).toBeDefined();
    expect(acaoConcluida?.id).toBe(2);
    expect(acaoConcluida?.titulo).toBe("Ação 2");
  });

  it("deve retornar undefined se nenhuma ação foi concluída", () => {
    const minhasAcoes = [
      { id: 1, titulo: "Ação 1", status: "em_andamento" },
      { id: 2, titulo: "Ação 2", status: "em_andamento" },
    ];

    const previousAcoes = [
      { id: 1, titulo: "Ação 1", status: "em_andamento" },
      { id: 2, titulo: "Ação 2", status: "em_andamento" },
    ];

    const acaoConcluida = minhasAcoes.find((acao) => {
      const acaoAnterior = previousAcoes.find((prev) => prev.id === acao.id);
      return (
        acaoAnterior?.status === "aguardando_avaliacao" &&
        acao.status === "concluida"
      );
    });

    expect(acaoConcluida).toBeUndefined();
  });
});
