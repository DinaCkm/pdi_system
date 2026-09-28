import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { COMPETENCIAS_AD_HISTORICAS } from "../../shared/competenciasAdRelacionamento";
import { focosPermitidosDaCompetenciaAD, separarFoco } from "../../shared/focosCompetencias";
import { codigoEixoTecnico, codigoFocoComportamental } from "../../shared/codigosCompetencia";

// Catálogo das competências de origem que podem receber ações no PDI, com código estável,
// para o EcoLíder vincular cursos. Eixo técnico cujo código aparece com nomes diferentes
// nas matrizes vem com conflito = true e não deve ser vinculado até ser revisado.

export type ItemCatalogo = {
  codigo: string;
  tipo: "COMPORTAMENTAL" | "TECNICA";
  competencia: string;
  nivel: string | null;
  grupo: string;
  conflito: boolean;
  nomesEncontrados?: string[];
};

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export function catalogoComportamental(): ItemCatalogo[] {
  const itens: ItemCatalogo[] = [];
  for (const competenciaAD of COMPETENCIAS_AD_HISTORICAS) {
    for (const foco of focosPermitidosDaCompetenciaAD(competenciaAD)) {
      const partes = separarFoco(foco);
      const codigo = codigoFocoComportamental(competenciaAD, foco);
      if (!partes || !codigo) continue;
      itens.push({ codigo, tipo: "COMPORTAMENTAL", competencia: partes.nome, nivel: partes.nivel, grupo: competenciaAD, conflito: false });
    }
  }
  return itens;
}

export function catalogoTecnicoDasLinhas(linhas: Array<{ eixoId: unknown; eixoNome: unknown }>): ItemCatalogo[] {
  const nomesPorCodigo = new Map<string, Set<string>>();
  for (const linha of linhas) {
    const codigo = codigoEixoTecnico(String(linha.eixoId ?? ""));
    const nome = String(linha.eixoNome ?? "").trim();
    if (!codigo || !nome) continue;
    const nomes = nomesPorCodigo.get(codigo) ?? new Set<string>();
    nomes.add(nome);
    nomesPorCodigo.set(codigo, nomes);
  }
  return Array.from(nomesPorCodigo.entries())
    .map(([codigo, nomes]) => {
      const lista = Array.from(nomes).sort((a, b) => a.localeCompare(b, "pt-BR"));
      return {
        codigo,
        tipo: "TECNICA" as const,
        competencia: lista[0],
        nivel: null,
        grupo: "Eixo técnico",
        conflito: lista.length > 1,
        ...(lista.length > 1 ? { nomesEncontrados: lista } : {}),
      };
    })
    .sort((a, b) => a.competencia.localeCompare(b.competencia, "pt-BR"));
}

export async function montarCatalogoCompetencias(): Promise<ItemCatalogo[]> {
  const conn = await getDb();
  let tecnicos: ItemCatalogo[] = [];
  if (conn) {
    try {
      const linhas = rowsOf<any>(await conn.execute(sql`
        SELECT DISTINCT eixo_id AS eixoId, eixo_nome AS eixoNome FROM prova_utic_matriz_eixos
      `));
      tecnicos = catalogoTecnicoDasLinhas(linhas);
    } catch (error) {
      console.warn("[catalogoCompetencias] Matriz técnica indisponível:", error);
    }
  }
  return [...catalogoComportamental(), ...tecnicos];
}
