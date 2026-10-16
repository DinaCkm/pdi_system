import { sql } from "drizzle-orm";
import { getDb } from "../db";
import { COMPETENCIAS_AD_HISTORICAS, competenciaADRelacionadaDaMacro } from "../../shared/competenciasAdRelacionamento";
import { focosPermitidosDaCompetenciaAD } from "../../shared/focosCompetencias";

// Lastro das ações: toda ação fica ligada a um eixo técnico (matriz da unidade)
// ou a uma competência comportamental da Avaliação de Desempenho.
// As colunas são criadas aqui (sem migração) para não depender do drizzle-kit.
let schemaPronto = false;

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export const TIPOS_COMPETENCIA = ["TECNICA", "COMPORTAMENTAL"] as const;
export type TipoCompetencia = (typeof TIPOS_COMPETENCIA)[number];
export const COMPETENCIAS_COMPORTAMENTAIS_AD: readonly string[] = COMPETENCIAS_AD_HISTORICAS;

export async function ensureAcoesLastroSchema() {
  if (schemaPronto) return;
  const conn = await getDb();
  if (!conn) return;
  const colunas = new Set(
    rowsOf<any>(await conn.execute(sql`
      SELECT COLUMN_NAME AS nome
        FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actions'
    `)).map((row) => String(row.nome).toLowerCase()),
  );
  if (!colunas.has("tipo_competencia")) {
    await conn.execute(sql.raw("ALTER TABLE actions ADD COLUMN tipo_competencia VARCHAR(20) NULL"));
  }
  if (!colunas.has("eixo_nome")) {
    await conn.execute(sql.raw("ALTER TABLE actions ADD COLUMN eixo_nome VARCHAR(255) NULL"));
  }
  if (!colunas.has("foco_bem")) {
    await conn.execute(sql.raw("ALTER TABLE actions ADD COLUMN foco_bem VARCHAR(255) NULL"));
  }
  schemaPronto = true;
}

// Eixos técnicos da matriz individual do empregado (mesmos da prova e da Evolução Individual).
export async function eixosTecnicosDoColaborador(colaboradorId: number): Promise<string[]> {
  const conn = await getDb();
  if (!conn) return [];
  const linhas = rowsOf<any>(await conn.execute(sql`
    SELECT e.eixo_nome AS eixo
      FROM prova_utic_matrizes m
      JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
     WHERE m.colaborador_id = ${colaboradorId}
     ORDER BY e.id
  `));
  return Array.from(new Set(linhas.map((l) => String(l.eixo ?? "").trim()).filter(Boolean)));
}

export async function colaboradorDoPdi(pdiId: number): Promise<number | null> {
  const conn = await getDb();
  if (!conn) return null;
  const linhas = rowsOf<any>(await conn.execute(sql`SELECT colaboradorId FROM pdis WHERE id = ${pdiId} LIMIT 1`));
  return linhas[0]?.colaboradorId ? Number(linhas[0].colaboradorId) : null;
}

// Toda ação precisa da competência de origem: tipo + eixo e, no comportamental, o foco
// (Básica, Essencial, Master ou Jornada do Futuro) ligado àquela competência da AD.
export async function validarLastro(pdiId: number, tipo: TipoCompetencia, eixoNome: string, focoBem?: string | null) {
  const eixo = String(eixoNome ?? "").trim();
  const foco = String(focoBem ?? "").trim() || null;
  if (tipo === "COMPORTAMENTAL") {
    if (!COMPETENCIAS_COMPORTAMENTAIS_AD.includes(eixo)) {
      return { erro: `"${eixo}" não é uma competência comportamental da Avaliação de Desempenho.` } as const;
    }
    if (!foco) {
      return { erro: "Escolha o foco da ação (Básica, Essencial, Master ou Jornada do Futuro)." } as const;
    }
    if (!focosPermitidosDaCompetenciaAD(eixo).includes(foco)) {
      return { erro: `O foco "${foco}" não pertence à competência "${eixo}".` } as const;
    }
    return { eixo, foco } as const;
  }
  const colaboradorId = await colaboradorDoPdi(pdiId);
  const eixosDoEmpregado = colaboradorId ? await eixosTecnicosDoColaborador(colaboradorId) : [];
  if (!eixosDoEmpregado.includes(eixo)) {
    return { erro: `O eixo técnico "${eixo}" não está na matriz deste empregado.` } as const;
  }
  return { eixo, foco: null } as const;
}

export async function lastroDaAcao(actionId: number) {
  await ensureAcoesLastroSchema();
  const conn = await getDb();
  if (!conn) return null;
  const linhas = rowsOf<any>(await conn.execute(sql`
    SELECT pdiId, tipo_competencia AS tipo, eixo_nome AS eixo, foco_bem AS foco FROM actions WHERE id = ${actionId} LIMIT 1
  `));
  const l = linhas[0];
  if (!l) return null;
  return { pdiId: Number(l.pdiId), tipo: (l.tipo ?? null) as TipoCompetencia | null, eixo: l.eixo ?? null, foco: l.foco ?? null };
}

export async function gravarLastro(actionId: number, tipo: TipoCompetencia, eixo: string, foco: string | null) {
  const conn = await getDb();
  if (!conn) throw new Error("Database not available");
  await conn.execute(sql`
    UPDATE actions
       SET tipo_competencia = ${tipo}, eixo_nome = ${eixo}, foco_bem = ${foco}
     WHERE id = ${actionId}
  `);
}

export async function lastroDasAcoes(): Promise<Map<number, { tipo: string | null; eixo: string | null; foco: string | null }>> {
  const conn = await getDb();
  const mapa = new Map<number, { tipo: string | null; eixo: string | null; foco: string | null }>();
  if (!conn) return mapa;
  const linhas = rowsOf<any>(await conn.execute(sql`
    SELECT id, tipo_competencia AS tipo, eixo_nome AS eixo, foco_bem AS foco FROM actions
  `));
  for (const l of linhas) mapa.set(Number(l.id), { tipo: l.tipo ?? null, eixo: l.eixo ?? null, foco: l.foco ?? null });
  return mapa;
}

export function rotuloDoEixo(tipo: string | null | undefined, eixo: string | null | undefined) {
  const nome = String(eixo ?? "").trim();
  if (!nome) return null;
  return `${tipo === "TECNICA" ? "TÉCNICA" : "COMPORTAMENTAL"} - ${nome}`;
}

// Ações que nascem fora da tela de criação (ex.: solicitação aprovada pelo RH) ganham o lastro
// a partir da macro comportamental escolhida, quando ela corresponde a uma competência da AD.
export async function derivarLastroPelaMacro(actionId: number) {
  await ensureAcoesLastroSchema();
  const conn = await getDb();
  if (!conn) return;
  const linhas = rowsOf<any>(await conn.execute(sql`
    SELECT a.eixo_nome AS eixo, m.nome AS macroNome
      FROM actions a
      LEFT JOIN competencias_macros m ON m.id = a.macroId
     WHERE a.id = ${actionId}
     LIMIT 1
  `));
  const linha = linhas[0];
  if (!linha || String(linha.eixo ?? "").trim()) return;
  const competencia = competenciaADRelacionadaDaMacro(linha.macroNome);
  if (competencia) await gravarLastro(actionId, "COMPORTAMENTAL", competencia, null);
}
