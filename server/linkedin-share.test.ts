import { describe, it, expect } from "vitest";

/**
 * Testes para a funcionalidade de compartilhamento no LinkedIn
 * 
 * A funcionalidade é puramente frontend (abre uma URL do LinkedIn com texto pré-preenchido),
 * então testamos a lógica de construção da URL e do texto de compartilhamento.
 */

describe("LinkedIn Share - Construção de URL", () => {
  // Função que replica a lógica de construção da URL do LinkedIn
  function buildLinkedInShareUrl(acao: { titulo: string; macroNome?: string }) {
    const linkedinText = encodeURIComponent(
      `Concluí mais uma etapa do meu Plano de Desenvolvimento Individual (PDI)!\n\nAção: "${acao.titulo}"${acao.macroNome ? `\nCompetência: "${acao.macroNome}"` : ''}\n\nInvestindo no meu crescimento profissional com o programa Eco do Bem - EVOLUIR!\n\n@competênciasdobem @ecobem\n\n#DesenvolvimentoProfissional #PDI #EcoDoBem #EVOLUIR #CrescimentoProfissional`
    );
    return `https://www.linkedin.com/feed/?shareActive=true&text=${linkedinText}`;
  }

  it("deve gerar URL válida do LinkedIn com título da ação", () => {
    const url = buildLinkedInShareUrl({ titulo: "Curso de Liderança" });
    
    expect(url).toContain("https://www.linkedin.com/feed/");
    expect(url).toContain("shareActive=true");
    expect(url).toContain("text=");
    expect(url).toContain(encodeURIComponent("Curso de Liderança"));
  });

  it("deve incluir competência quando disponível", () => {
    const url = buildLinkedInShareUrl({ 
      titulo: "Curso de Liderança", 
      macroNome: "Gestão de Pessoas" 
    });
    
    expect(url).toContain(encodeURIComponent("Gestão de Pessoas"));
    expect(url).toContain(encodeURIComponent('Competência:'));
  });

  it("deve omitir competência quando não disponível", () => {
    const url = buildLinkedInShareUrl({ titulo: "Curso de Liderança" });
    
    expect(url).not.toContain(encodeURIComponent('Competência:'));
  });

  it("deve incluir menções @competênciasdobem e @ecobem", () => {
    const url = buildLinkedInShareUrl({ titulo: "Teste" });
    
    expect(url).toContain(encodeURIComponent("@competênciasdobem"));
    expect(url).toContain(encodeURIComponent("@ecobem"));
  });

  it("deve incluir hashtags do programa", () => {
    const url = buildLinkedInShareUrl({ titulo: "Teste" });
    
    expect(url).toContain(encodeURIComponent("#DesenvolvimentoProfissional"));
    expect(url).toContain(encodeURIComponent("#PDI"));
    expect(url).toContain(encodeURIComponent("#EcoDoBem"));
    expect(url).toContain(encodeURIComponent("#EVOLUIR"));
    expect(url).toContain(encodeURIComponent("#CrescimentoProfissional"));
  });

  it("deve incluir menção ao programa Eco do Bem - EVOLUIR", () => {
    const url = buildLinkedInShareUrl({ titulo: "Teste" });
    
    expect(url).toContain(encodeURIComponent("Eco do Bem - EVOLUIR"));
  });

  it("deve gerar URL decodificável com texto legível", () => {
    const url = buildLinkedInShareUrl({ 
      titulo: "Apresentação Executiva", 
      macroNome: "Comunicação" 
    });
    
    // Extrair o texto do parâmetro
    const textParam = url.split("text=")[1];
    const decodedText = decodeURIComponent(textParam);
    
    expect(decodedText).toContain("Concluí mais uma etapa");
    expect(decodedText).toContain("Apresentação Executiva");
    expect(decodedText).toContain("Comunicação");
    expect(decodedText).toContain("@competênciasdobem");
    expect(decodedText).toContain("@ecobem");
  });

  it("deve lidar com caracteres especiais no título da ação", () => {
    const url = buildLinkedInShareUrl({ 
      titulo: 'Ação com "aspas" e acentuação: é, ã, ç' 
    });
    
    // Deve gerar URL válida sem erros
    expect(url).toContain("https://www.linkedin.com/feed/");
    
    // Texto decodificado deve conter os caracteres especiais
    const textParam = url.split("text=")[1];
    const decodedText = decodeURIComponent(textParam);
    expect(decodedText).toContain('Ação com "aspas" e acentuação: é, ã, ç');
  });
});
