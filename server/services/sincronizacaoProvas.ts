import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  gerarHashSnapshot,
  invalidarHomologacoes,
  marcarPendenciaHomologacao,
  obterHomologacaoAtual,
} from "./homologacaoProvas";

/**
 * Regras de consistência entre a prova importada, a homologação e as aplicações agendadas.
 *
 * - O "conteúdo" de uma prova é o que o empregado vê: id da questão, enunciado, alternativas e gabarito.
 *   Eixo, macroárea e microárea NÃO fazem parte do conteúdo.
 * - Se a prova for revalidada sem mudança de conteúdo, a homologação continua valendo.
 * - Se o conteúdo mudar, a homologação cai e a prova precisa de novo teste.
 * - Aplicações AGENDADAS (ainda não liberadas) recebem a versão revalidada da prova.
 *   Aplicações já liberadas/encerradas/calculadas nunca são alteradas.
 */

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function parseJson<T>(valor: unknown): T {
  if (typeof valor === "string") return JSON.parse(valor) as T;
  return valor as T;
}

export function hashConteudo(questoes: any[]) {
  const conteudo = (Array.isArray(questoes) ? questoes : []).map((q: any) => ({
    id: String(q?.id ?? ""),
    enunciado: String(q?.enunciado ?? ""),
    gabarito: String(q?.gabarito ?? ""),
    opcoes: (Array.isArray(q?.opcoes) ? q.opcoes : []).map((o: any) => ({
      letra: String(o?.letra ?? ""),
      texto: String(o?.texto ?? ""),
      naoSei: Boolean(o?.naoSei),
    })),
  }));
  return createHash("sha256").update(JSON.stringify(conteudo)).digest("hex");
}

async function lerProva(db: any, provaId: number) {
  const result = await db.execute(sql`
    SELECT id, codigo, nome, unidade, ano, ciclo_id AS cicloId, total_questoes AS totalQuestoes,
           questoes_json AS questoesJson, status
      FROM provas_importadas
     WHERE id = ${provaId}
     LIMIT 1
  `);
  const prova = rowsOf<any>(result)[0];
  if (!prova) throw new Error("Prova não encontrada.");
  return { ...prova, questoes: parseJson<any[]>(prova.questoesJson) };
}

/** Mesmo formato gerado pela homologação (routers/homologacaoProvas.ts > obterProvaAtual). */
function snapshotHomologacao(prova: any) {
  return {
    id: Number(prova.id),
    codigo: String(prova.codigo),
    nome: String(prova.nome),
    unidade: String(prova.unidade),
    ano: Number(prova.ano),
    totalQuestoes: Number(prova.totalQuestoes),
    questoes: prova.questoes,
  };
}

/** Mesmo formato gerado na criação da aplicação (routers/aplicacoesProficiencia.ts > obterProvaValidada). */
function snapshotAplicacao(prova: any) {
  return {
    id: Number(prova.id),
    codigo: String(prova.codigo),
    nome: String(prova.nome),
    unidade: String(prova.unidade),
    ano: Number(prova.ano),
    cicloId: prova.cicloId ? Number(prova.cicloId) : null,
    totalQuestoes: Number(prova.totalQuestoes),
    questoes: prova.questoes,
  };
}

/**
 * Chamado quando a prova passa de RASCUNHO para VALIDADA.
 * Mantém a homologação se só mudaram eixos/macroárea/microárea; caso contrário, invalida.
 */
export async function ajustarHomologacaoAposValidacao(db: any, provaId: number) {
  const prova = await lerProva(db, provaId);
  const homologacao = await obterHomologacaoAtual(db, provaId);
  const ativa = homologacao && ["EM_TESTE", "TESTADA", "HOMOLOGADA"].includes(String(homologacao.status));

  if (ativa && homologacao.snapshotJson) {
    let testada: any = null;
    try { testada = parseJson<any>(homologacao.snapshotJson); } catch { testada = null; }
    if (testada && hashConteudo(testada.questoes) === hashConteudo(prova.questoes)) {
      const novo = snapshotHomologacao(prova);
      await db.execute(sql`
        UPDATE provas_importadas_homologacao
           SET snapshot_json = ${JSON.stringify(novo)},
               snapshot_hash = ${gerarHashSnapshot(novo)},
               updated_at = NOW()
         WHERE id = ${Number(homologacao.id)}
      `);
      return { homologacaoMantida: true, homologacaoInvalidada: false };
    }
    await invalidarHomologacoes(db, provaId, "INVALIDADA_POR_EDICAO");
    await marcarPendenciaHomologacao(db, provaId);
    return { homologacaoMantida: false, homologacaoInvalidada: true };
  }

  await marcarPendenciaHomologacao(db, provaId);
  return { homologacaoMantida: false, homologacaoInvalidada: false };
}

/** Lista as aplicações oficiais (não de teste) ainda ativas desta prova. */
export async function listarAplicacoesAtivas(db: any, provaId: number) {
  const result = await db.execute(sql`
    SELECT a.id, a.titulo, a.agendada_para AS agendadaPara, a.status
      FROM aplicacoes_proficiencia a
     WHERE a.prova_id = ${provaId}
       AND a.status IN ('AGENDADA','LIBERADA')
       AND NOT EXISTS (SELECT 1 FROM provas_importadas_homologacao h WHERE h.aplicacao_teste_id = a.id)
     ORDER BY a.agendada_para
  `);
  return rowsOf<any>(result);
}

/** Atualiza a cópia da prova nas aplicações AGENDADAS (não liberadas). */
export async function sincronizarAplicacoesAgendadas(db: any, provaId: number) {
  const prova = await lerProva(db, provaId);
  const ativas = await listarAplicacoesAtivas(db, provaId);
  const snapshot = JSON.stringify(snapshotAplicacao(prova));
  const atualizadas: any[] = [];
  const naoAtualizadas: any[] = [];
  for (const aplicacao of ativas) {
    if (String(aplicacao.status) === "AGENDADA") {
      await db.execute(sql`
        UPDATE aplicacoes_proficiencia
           SET prova_snapshot_json = ${snapshot}
         WHERE id = ${Number(aplicacao.id)} AND status = 'AGENDADA'
      `);
      atualizadas.push(aplicacao);
    } else {
      naoAtualizadas.push(aplicacao);
    }
  }
  return { atualizadas, naoAtualizadas };
}
