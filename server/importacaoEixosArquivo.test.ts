import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { lerPlanilha, percentual } from "../client/src/pages/ImportarEixosAvaliacoes";

function workbookBuffer(linhas: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(linhas), "Dados");
  return XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

describe("upload de eixos", () => {
  it("converte o decimal da matriz para percentual", () => {
    expect(percentual(0.67, 6)).toBe(67);
    expect(percentual("25.00%", 6)).toBe(25);
    expect(percentual("", 6)).toBeNull();
  });

  it("localiza o cabeçalho após os textos explicativos da matriz", () => {
    const linhas = lerPlanilha(workbookBuffer([
      ["FECHAMENTO DA ANÁLISE"],
      ["Matriz individual de eixos técnicos"],
      ["Unidade", "Empregado", "Eixo", "Percentual histórico", "Classificação", "Justificativa", "Fonte da certificação", "Fonte das atividades", "Observações"],
      ["Unidade Fictícia", "Pessoa Exemplo", "Gestão de Processos", 0.67, "Essencial", "Dado sintético para teste", "Fonte de teste", "Fonte de teste", ""],
    ]), "TECNICA");
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toMatchObject({ linha: 4, nome: "Pessoa Exemplo", eixoNome: "Gestão de Processos", pontuacao: 67, relacao: "ESSENCIAL" });
  });

  it("mantém classificações e pontuações ausentes como pendentes", () => {
    const linhas = lerPlanilha(workbookBuffer([
      ["Empregado", "Eixo", "Percentual histórico", "Classificação"],
      ["Pessoa Exemplo", "Análise de Dados", "", ""],
    ]), "TECNICA");
    expect(linhas[0]).toMatchObject({ pontuacao: null, relacao: "PENDENTE" });
  });
});
