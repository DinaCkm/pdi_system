import { describe, it, expect } from "vitest";
import { listNormasRegras, createNormaRegra, updateNormaRegra, deleteNormaRegra } from "./db";

describe("Normas e Regras - CRUD", () => {
  it("deve listar normas e regras ativas", async () => {
    const normas = await listNormasRegras(true);
    expect(Array.isArray(normas)).toBe(true);
    expect(normas.length).toBeGreaterThan(0);
    // Todas devem estar ativas
    normas.forEach((n: any) => {
      expect(n.ativo).toBe(true);
    });
  });

  it("deve listar todas as normas (incluindo inativas) quando onlyActive=false", async () => {
    const todas = await listNormasRegras(false);
    expect(Array.isArray(todas)).toBe(true);
    expect(todas.length).toBeGreaterThan(0);
  });

  it("deve retornar normas ordenadas por campo ordem", async () => {
    const normas = await listNormasRegras(true);
    for (let i = 1; i < normas.length; i++) {
      expect(normas[i].ordem).toBeGreaterThanOrEqual(normas[i - 1].ordem);
    }
  });

  it("deve ter normas com categorias 'regras' e 'fluxo'", async () => {
    const normas = await listNormasRegras(true);
    const categorias = [...new Set(normas.map((n: any) => n.categoria))];
    expect(categorias).toContain("regras");
    expect(categorias).toContain("fluxo");
  });

  it("deve ter normas de regras e fluxo nos dados iniciais", async () => {
    const normas = await listNormasRegras(true);
    const regras = normas.filter((n: any) => n.categoria === "regras");
    const fluxo = normas.filter((n: any) => n.categoria === "fluxo");
    expect(regras.length).toBeGreaterThanOrEqual(5);
    expect(fluxo.length).toBeGreaterThanOrEqual(5);
  });

  it("deve criar uma nova norma", async () => {
    const nova = await createNormaRegra({
      titulo: "Norma de Teste",
      subtitulo: "Subtítulo teste",
      conteudo: "Conteúdo de teste para vitest",
      categoria: "regras",
      icone: "Star",
      ordem: 99,
      ativo: true,
    });
    expect(nova).toBeDefined();

    // Verificar que foi criada
    const todas = await listNormasRegras(false);
    const criada = todas.find((n: any) => n.titulo === "Norma de Teste");
    expect(criada).toBeDefined();
    expect(criada!.conteudo).toBe("Conteúdo de teste para vitest");

    // Limpar: deletar a norma de teste
    if (criada) {
      await deleteNormaRegra(criada.id);
    }
  });

  it("deve atualizar uma norma existente", async () => {
    // Criar uma norma temporária
    const nova = await createNormaRegra({
      titulo: "Norma para Update",
      subtitulo: "Sub",
      conteudo: "Original",
      categoria: "regras",
      icone: "Star",
      ordem: 98,
      ativo: true,
    });

    const todas = await listNormasRegras(false);
    const criada = todas.find((n: any) => n.titulo === "Norma para Update");
    expect(criada).toBeDefined();

    // Atualizar
    await updateNormaRegra(criada!.id, {
      titulo: "Norma Atualizada",
      conteudo: "Conteúdo atualizado",
    });

    const atualizadas = await listNormasRegras(false);
    const atualizada = atualizadas.find((n: any) => n.id === criada!.id);
    expect(atualizada!.titulo).toBe("Norma Atualizada");
    expect(atualizada!.conteudo).toBe("Conteúdo atualizado");

    // Limpar
    await deleteNormaRegra(criada!.id);
  });

  it("deve deletar uma norma", async () => {
    const nova = await createNormaRegra({
      titulo: "Norma para Deletar",
      subtitulo: "Sub",
      conteudo: "Será deletada",
      categoria: "fluxo",
      icone: "Trash2",
      ordem: 97,
      ativo: true,
    });

    const antes = await listNormasRegras(false);
    const criada = antes.find((n: any) => n.titulo === "Norma para Deletar");
    expect(criada).toBeDefined();

    await deleteNormaRegra(criada!.id);

    const depois = await listNormasRegras(false);
    const deletada = depois.find((n: any) => n.titulo === "Norma para Deletar");
    expect(deletada).toBeUndefined();
  });
});
