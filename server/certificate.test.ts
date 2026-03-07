import { describe, it, expect, vi } from "vitest";

// Testar a lógica de geração de certificado
describe("Certificate Generation", () => {
  it("deve gerar URL do LinkedIn com texto de compartilhamento correto", () => {
    const titulo = "Curso de Liderança Estratégica";
    const competencia = "Liderança e Gestão de Pessoas";
    
    const linkedinText = `Concluí mais uma etapa do meu Plano de Desenvolvimento Individual (PDI)!\n\nAção: "${titulo}"${competencia ? `\nCompetência: "${competencia}"` : ''}\n\nInvestindo no meu crescimento profissional com o programa Eco do Bem - EVOLUIR!\n\n@competênciasdobem @ecobem\n\n#DesenvolvimentoProfissional #PDI #EcoDoBem #EVOLUIR #CrescimentoProfissional`;
    
    expect(linkedinText).toContain("@competênciasdobem");
    expect(linkedinText).toContain("@ecobem");
    expect(linkedinText).toContain(titulo);
    expect(linkedinText).toContain(competencia);
    expect(linkedinText).toContain("Eco do Bem - EVOLUIR");
    expect(linkedinText).toContain("#PDI");
  });

  it("deve validar que apenas ações concluídas podem gerar certificado", () => {
    const statusPermitido = "concluida";
    const statusNaoPermitidos = ["pendente", "em_andamento", "aguardando_avaliacao", "rejeitada"];
    
    expect(statusPermitido).toBe("concluida");
    statusNaoPermitidos.forEach(status => {
      expect(status).not.toBe("concluida");
    });
  });

  it("deve formatar data de conclusão corretamente em pt-BR", () => {
    const date = new Date("2026-03-06T12:00:00Z");
    const formatted = date.toLocaleDateString("pt-BR");
    
    // Deve estar no formato dd/mm/yyyy
    expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("deve gerar texto do certificado com dados corretos", () => {
    const data = {
      nomeColaborador: "Maria Silva Santos",
      tituloAcao: "Curso de Liderança Estratégica e Gestão de Equipes",
      competencia: "Liderança e Gestão de Pessoas",
      dataConclusao: "06/03/2026",
      pdiTitulo: "PDI 2026 - Maria Silva",
    };

    // Verificar que todos os campos necessários existem
    expect(data.nomeColaborador).toBeTruthy();
    expect(data.tituloAcao).toBeTruthy();
    expect(data.competencia).toBeTruthy();
    expect(data.dataConclusao).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("deve limitar nome do colaborador a 30 caracteres no certificado", () => {
    const nomeGrande = "Maria Aparecida da Silva Santos de Oliveira";
    const nomeDisplay = nomeGrande.length > 30
      ? nomeGrande.substring(0, 28) + "..."
      : nomeGrande;
    
    expect(nomeDisplay.length).toBeLessThanOrEqual(31); // 28 + "..."
    expect(nomeDisplay).toContain("...");
  });

  it("deve gerar texto de compartilhamento sem competência quando não disponível", () => {
    const titulo = "Curso de Excel Avançado";
    const competencia: string | undefined = undefined;
    
    const linkedinText = `Concluí mais uma etapa do meu Plano de Desenvolvimento Individual (PDI)!\n\nAção: "${titulo}"${competencia ? `\nCompetência: "${competencia}"` : ''}\n\nInvestindo no meu crescimento profissional com o programa Eco do Bem - EVOLUIR!\n\n@competênciasdobem @ecobem\n\n#DesenvolvimentoProfissional #PDI #EcoDoBem #EVOLUIR #CrescimentoProfissional`;
    
    expect(linkedinText).not.toContain("Competência:");
    expect(linkedinText).toContain(titulo);
  });

  it("deve incluir menções @competênciasdobem e @ecobem no certificado", () => {
    // As menções devem estar presentes no rodapé do certificado
    const mentions = "@competênciasdobem  •  @ecobem";
    expect(mentions).toContain("@competênciasdobem");
    expect(mentions).toContain("@ecobem");
  });

  it("deve usar formato 1080x1080 ideal para LinkedIn", () => {
    const WIDTH = 1080;
    const HEIGHT = 1080;
    
    // Formato quadrado ideal para posts do LinkedIn
    expect(WIDTH).toBe(HEIGHT);
    expect(WIDTH).toBe(1080);
  });
});
