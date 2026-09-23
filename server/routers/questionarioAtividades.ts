import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import {
  departamentos,
  questionarioAtividadesEixosTecnicos,
  questionarioAtividadesHistorico,
  questionarioAtividadesRespostas,
  questionariosAtividadesFuncao,
  users,
} from "../../drizzle/schema";
import { PERGUNTAS_QUESTIONARIO_ATIVIDADES } from "../../shared/questionarioAtividades";

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível.",
    });
  }
  return db;
}

const respostaSchema = z.object({
  chave: z.string().min(1).max(100),
  resposta: z.string().nullable().optional(),
});

const classificacaoEixoSchema = z.object({
  eixoChave: z.string().min(1).max(255),
  eixoNome: z.string().min(1).max(255),
  classificacao: z.enum(["ESSENCIAL", "NAO_ESSENCIAL", "TRANSVERSAL"]).nullable(),
  justificativa: z.string().nullable().optional(),
});

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function normalizarEixo(valor: string) {
  return valor
    .trim()
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseJsonSeguro<T>(valor: unknown): T | null {
  try {
    if (valor && typeof valor === "object") return valor as T;
    return JSON.parse(String(valor ?? "null")) as T;
  } catch {
    return null;
  }
}

export const questionarioAtividadesRouter = router({
  empregados: adminProcedure.query(async () => {
    const db = await dbObrigatorio();

    return db
      .select({
        id: users.id,
        nome: users.name,
        cargo: users.cargo,
        email: users.email,
        departamentoId: users.departamentoId,
        departamentoNome: departamentos.nome,
        status: users.status,
      })
      .from(users)
      .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
      .where(eq(users.status, "ativo"))
      .orderBy(asc(users.name));
  }),

  get: adminProcedure
    .input(
      z.object({
        colaboradorId: z.number().int().positive(),
        ano: z.number().int().min(2020).max(2100),
      }),
    )
    .query(async ({ input }) => {
      const db = await dbObrigatorio();

      const questionario = (
        await db
          .select()
          .from(questionariosAtividadesFuncao)
          .where(
            and(
              eq(questionariosAtividadesFuncao.colaboradorId, input.colaboradorId),
              eq(questionariosAtividadesFuncao.ano, input.ano),
            ),
          )
          .orderBy(desc(questionariosAtividadesFuncao.versao), desc(questionariosAtividadesFuncao.id))
          .limit(1)
      )[0] ?? null;

      const respostas = questionario
        ? await db
            .select()
            .from(questionarioAtividadesRespostas)
            .where(eq(questionarioAtividadesRespostas.questionarioId, questionario.id))
            .orderBy(asc(questionarioAtividadesRespostas.ordem), asc(questionarioAtividadesRespostas.id))
        : [];

      const respostaPorChave = new Map(
        respostas.map((item) => [item.chave, item.resposta ?? ""]),
      );

      return {
        questionario,
        perguntas: PERGUNTAS_QUESTIONARIO_ATIVIDADES.map((pergunta) => ({
          ...pergunta,
          resposta: respostaPorChave.get(pergunta.chave) ?? "",
        })),
      };
    }),

  eixosTecnicos: adminProcedure
    .input(
      z.object({
        colaboradorId: z.number().int().positive(),
        ano: z.number().int().min(2020).max(2100),
      }),
    )
    .query(async ({ input }) => {
      const db = await dbObrigatorio();

      const questionario = (
        await db
          .select()
          .from(questionariosAtividadesFuncao)
          .where(
            and(
              eq(questionariosAtividadesFuncao.colaboradorId, input.colaboradorId),
              eq(questionariosAtividadesFuncao.ano, input.ano),
            ),
          )
          .orderBy(desc(questionariosAtividadesFuncao.versao), desc(questionariosAtividadesFuncao.id))
          .limit(1)
      )[0] ?? null;

      const aplicacaoResult = await db.execute(sql`
        SELECT a.id AS aplicacaoId, a.prova_id AS provaId, a.prova_snapshot_json AS provaSnapshotJson,
               a.titulo AS aplicacaoTitulo, p.codigo AS provaCodigo, p.nome AS provaNome,
               p.unidade AS provaUnidade, p.ano AS provaAno
          FROM aplicacoes_proficiencia a
          JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id = a.id
          JOIN provas_importadas p ON p.id = a.prova_id
         WHERE ap.colaborador_id = ${input.colaboradorId}
           AND p.ano = ${input.ano}
         ORDER BY a.agendada_para DESC, a.id DESC
         LIMIT 1
      `);
      const aplicacao = rowsOf<any>(aplicacaoResult)[0] ?? null;

      if (!aplicacao) {
        return {
          questionarioId: questionario?.id ?? null,
          prova: null,
          eixos: [],
          aviso: "Nenhuma prova aplicada foi encontrada para este empregado no período selecionado.",
        };
      }

      const snapshot = parseJsonSeguro<any>(aplicacao.provaSnapshotJson);
      const questoes = Array.isArray(snapshot?.questoes) ? snapshot.questoes : [];
      const catalogo = new Map<string, string>();

      for (const questao of questoes) {
        for (const eixo of Array.isArray(questao?.eixos) ? questao.eixos : []) {
          const eixoNome = String(eixo?.nome ?? "").trim();
          if (!eixoNome) continue;
          const eixoChave = normalizarEixo(eixoNome);
          if (!eixoChave || catalogo.has(eixoChave)) continue;
          catalogo.set(eixoChave, eixoNome);
        }
      }

      const existentes = questionario
        ? await db
            .select()
            .from(questionarioAtividadesEixosTecnicos)
            .where(eq(questionarioAtividadesEixosTecnicos.questionarioId, questionario.id))
        : [];

      const origemProvaChave = `APLICACAO:${Number(aplicacao.aplicacaoId)}`;
      const existentePorEixo = new Map(
        existentes
          .filter(item => item.origemProvaChave === origemProvaChave)
          .map(item => [item.eixoChave, item]),
      );

      return {
        questionarioId: questionario?.id ?? null,
        prova: {
          provaId: Number(aplicacao.provaId),
          aplicacaoId: Number(aplicacao.aplicacaoId),
          codigo: aplicacao.provaCodigo,
          nome: aplicacao.provaNome,
          unidade: aplicacao.provaUnidade,
          ano: Number(aplicacao.provaAno),
          aplicacaoTitulo: aplicacao.aplicacaoTitulo,
          origem: "SNAPSHOT_APLICACAO" as const,
          origemProvaChave,
        },
        eixos: Array.from(catalogo.entries()).map(([eixoChave, eixoNome]) => {
          const existente = existentePorEixo.get(eixoChave);
          return {
            eixoChave,
            eixoNome,
            classificacao: existente?.classificacao ?? null,
            statusClassificacao: existente?.statusClassificacao ?? "PENDENTE",
            justificativa: existente?.justificativa ?? "",
            classificadoPor: existente?.classificadoPor ?? null,
            classificadoEm: existente?.classificadoEm ?? null,
          };
        }),
        aviso: null,
      };
    }),

  salvarEixosTecnicos: adminProcedure
    .input(
      z.object({
        colaboradorId: z.number().int().positive(),
        ano: z.number().int().min(2020).max(2100),
        provaId: z.number().int().positive(),
        aplicacaoId: z.number().int().positive(),
        origemProvaChave: z.string().min(1).max(80),
        eixos: z.array(classificacaoEixoSchema).min(1),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const usuarioId = Number(ctx.user!.id);

      const questionario = (
        await db
          .select()
          .from(questionariosAtividadesFuncao)
          .where(
            and(
              eq(questionariosAtividadesFuncao.colaboradorId, input.colaboradorId),
              eq(questionariosAtividadesFuncao.ano, input.ano),
            ),
          )
          .orderBy(desc(questionariosAtividadesFuncao.versao), desc(questionariosAtividadesFuncao.id))
          .limit(1)
      )[0] ?? null;

      if (!questionario) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Salve o questionário antes de classificar os eixos técnicos.",
        });
      }

      const aplicacaoResult = await db.execute(sql`
        SELECT a.id AS aplicacaoId, a.prova_id AS provaId, a.prova_snapshot_json AS provaSnapshotJson
          FROM aplicacoes_proficiencia a
          JOIN aplicacoes_proficiencia_participantes ap ON ap.aplicacao_id = a.id
         WHERE a.id = ${input.aplicacaoId}
           AND a.prova_id = ${input.provaId}
           AND ap.colaborador_id = ${input.colaboradorId}
         LIMIT 1
      `);
      const aplicacao = rowsOf<any>(aplicacaoResult)[0];
      if (!aplicacao) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "A prova informada não corresponde a uma aplicação deste empregado.",
        });
      }

      const snapshot = parseJsonSeguro<any>(aplicacao.provaSnapshotJson);
      const catalogo = new Map<string, string>();
      for (const questao of Array.isArray(snapshot?.questoes) ? snapshot.questoes : []) {
        for (const eixo of Array.isArray(questao?.eixos) ? questao.eixos : []) {
          const eixoNome = String(eixo?.nome ?? "").trim();
          if (!eixoNome) continue;
          const eixoChave = normalizarEixo(eixoNome);
          if (eixoChave && !catalogo.has(eixoChave)) catalogo.set(eixoChave, eixoNome);
        }
      }

      for (const entrada of input.eixos) {
        const nomeOficial = catalogo.get(entrada.eixoChave);
        if (!nomeOficial) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `O eixo "${entrada.eixoNome}" não pertence ao snapshot da prova aplicada.`,
          });
        }

        const justificativa = entrada.justificativa?.trim() || null;
        if (entrada.classificacao && !justificativa) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Informe a justificativa do eixo "${nomeOficial}" com base no questionário.`,
          });
        }

        const existente = (
          await db
            .select()
            .from(questionarioAtividadesEixosTecnicos)
            .where(
              and(
                eq(questionarioAtividadesEixosTecnicos.questionarioId, questionario.id),
                eq(questionarioAtividadesEixosTecnicos.origemProvaChave, input.origemProvaChave),
                eq(questionarioAtividadesEixosTecnicos.eixoChave, entrada.eixoChave),
              ),
            )
            .limit(1)
        )[0] ?? null;

        const classificacao = entrada.classificacao ?? null;
        const statusClassificacao = classificacao ? "CLASSIFICADO" : "PENDENTE";
        const agora = new Date().toISOString().slice(0, 19).replace("T", " ");

        if (!existente) {
          await db.insert(questionarioAtividadesEixosTecnicos).values({
            questionarioId: questionario.id,
            provaId: input.provaId,
            aplicacaoId: input.aplicacaoId,
            origemProva: "SNAPSHOT_APLICACAO",
            origemProvaChave: input.origemProvaChave,
            eixoChave: entrada.eixoChave,
            eixoNome: nomeOficial,
            classificacao,
            statusClassificacao,
            justificativa,
            classificadoPor: classificacao ? usuarioId : null,
            classificadoEm: classificacao ? agora : null,
          });
        } else {
          const anterior = JSON.stringify({
            classificacao: existente.classificacao,
            statusClassificacao: existente.statusClassificacao,
            justificativa: existente.justificativa,
          });
          const novo = JSON.stringify({
            classificacao,
            statusClassificacao,
            justificativa,
          });

          if (anterior !== novo) {
            await db.insert(questionarioAtividadesHistorico).values({
              questionarioId: questionario.id,
              campo: `eixoTecnico:${entrada.eixoChave}`,
              valorAnterior: anterior,
              valorNovo: novo,
              alteradoPor: usuarioId,
            });
          }

          await db
            .update(questionarioAtividadesEixosTecnicos)
            .set({
              eixoNome: nomeOficial,
              classificacao,
              statusClassificacao,
              justificativa,
              classificadoPor: classificacao ? usuarioId : null,
              classificadoEm: classificacao ? agora : null,
            })
            .where(eq(questionarioAtividadesEixosTecnicos.id, existente.id));
        }
      }

      return { success: true, questionarioId: questionario.id };
    }),

  historico: adminProcedure
    .input(z.object({ questionarioId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await dbObrigatorio();

      return db
        .select({
          id: questionarioAtividadesHistorico.id,
          campo: questionarioAtividadesHistorico.campo,
          valorAnterior: questionarioAtividadesHistorico.valorAnterior,
          valorNovo: questionarioAtividadesHistorico.valorNovo,
          alteradoPor: questionarioAtividadesHistorico.alteradoPor,
          alteradoPorNome: users.name,
          createdAt: questionarioAtividadesHistorico.createdAt,
        })
        .from(questionarioAtividadesHistorico)
        .leftJoin(users, eq(questionarioAtividadesHistorico.alteradoPor, users.id))
        .where(eq(questionarioAtividadesHistorico.questionarioId, input.questionarioId))
        .orderBy(desc(questionarioAtividadesHistorico.createdAt), desc(questionarioAtividadesHistorico.id));
    }),

  save: adminProcedure
    .input(
      z.object({
        colaboradorId: z.number().int().positive(),
        ano: z.number().int().min(2020).max(2100),
        status: z.enum(["rascunho", "preenchido", "validado"]).default("rascunho"),
        fonte: z.enum(["manual", "importado_historico"]).default("manual"),
        arquivoOrigemNome: z.string().max(255).nullable().optional(),
        arquivoOrigemUrl: z.string().nullable().optional(),
        observacoes: z.string().nullable().optional(),
        respostas: z.array(respostaSchema),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const db = await dbObrigatorio();
      const usuarioId = Number(ctx.user!.id);

      const colaborador = (
        await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, input.colaboradorId))
          .limit(1)
      )[0];

      if (!colaborador) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empregado não encontrado.",
        });
      }

      let questionario = (
        await db
          .select()
          .from(questionariosAtividadesFuncao)
          .where(
            and(
              eq(questionariosAtividadesFuncao.colaboradorId, input.colaboradorId),
              eq(questionariosAtividadesFuncao.ano, input.ano),
            ),
          )
          .orderBy(desc(questionariosAtividadesFuncao.versao), desc(questionariosAtividadesFuncao.id))
          .limit(1)
      )[0] ?? null;

      let questionarioId: number;

      if (!questionario) {
        const result = await db
          .insert(questionariosAtividadesFuncao)
          .values({
            colaboradorId: input.colaboradorId,
            ano: input.ano,
            versao: 1,
            status: input.status,
            fonte: input.fonte,
            arquivoOrigemNome: input.arquivoOrigemNome ?? null,
            arquivoOrigemUrl: input.arquivoOrigemUrl ?? null,
            observacoes: input.observacoes ?? null,
            preenchidoPor: usuarioId,
            validadoPor: input.status === "validado" ? usuarioId : null,
            validadoEm: input.status === "validado" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
          })
          .execute();

        questionarioId = Number(result[0]?.insertId || 0);
        if (!questionarioId) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível criar o questionário.",
          });
        }
      } else {
        questionarioId = Number(questionario.id);

        const camposAlterados: Array<[string, unknown, unknown]> = [
          ["status", questionario.status, input.status],
          ["fonte", questionario.fonte, input.fonte],
          ["arquivoOrigemNome", questionario.arquivoOrigemNome, input.arquivoOrigemNome ?? null],
          ["arquivoOrigemUrl", questionario.arquivoOrigemUrl, input.arquivoOrigemUrl ?? null],
          ["observacoes", questionario.observacoes, input.observacoes ?? null],
        ];

        for (const [campo, anterior, novo] of camposAlterados) {
          if (String(anterior ?? "") !== String(novo ?? "")) {
            await db.insert(questionarioAtividadesHistorico).values({
              questionarioId,
              campo,
              valorAnterior: anterior === null || anterior === undefined ? null : String(anterior),
              valorNovo: novo === null || novo === undefined ? null : String(novo),
              alteradoPor: usuarioId,
            });
          }
        }

        await db
          .update(questionariosAtividadesFuncao)
          .set({
            status: input.status,
            fonte: input.fonte,
            arquivoOrigemNome: input.arquivoOrigemNome ?? null,
            arquivoOrigemUrl: input.arquivoOrigemUrl ?? null,
            observacoes: input.observacoes ?? null,
            preenchidoPor: usuarioId,
            validadoPor: input.status === "validado" ? usuarioId : questionario.validadoPor,
            validadoEm:
              input.status === "validado"
                ? (questionario.validadoEm ?? new Date().toISOString().slice(0, 19).replace("T", " "))
                : questionario.validadoEm,
          })
          .where(eq(questionariosAtividadesFuncao.id, questionarioId));
      }

      const existentes = await db
        .select()
        .from(questionarioAtividadesRespostas)
        .where(eq(questionarioAtividadesRespostas.questionarioId, questionarioId));

      const existentePorChave = new Map(existentes.map((item) => [item.chave, item]));
      const perguntaPorChave = new Map(
        PERGUNTAS_QUESTIONARIO_ATIVIDADES.map((pergunta) => [pergunta.chave, pergunta]),
      );

      for (const entrada of input.respostas) {
        const pergunta = perguntaPorChave.get(entrada.chave);
        if (!pergunta) continue;

        const respostaNova = entrada.resposta?.trim() || null;
        const existente = existentePorChave.get(entrada.chave);

        if (!existente) {
          await db.insert(questionarioAtividadesRespostas).values({
            questionarioId,
            chave: pergunta.chave,
            pergunta: pergunta.pergunta,
            resposta: respostaNova,
            ordem: pergunta.ordem,
          });

          if (respostaNova) {
            await db.insert(questionarioAtividadesHistorico).values({
              questionarioId,
              campo: `resposta:${pergunta.chave}`,
              valorAnterior: null,
              valorNovo: respostaNova,
              alteradoPor: usuarioId,
            });
          }
          continue;
        }

        if (String(existente.resposta ?? "") !== String(respostaNova ?? "")) {
          await db.insert(questionarioAtividadesHistorico).values({
            questionarioId,
            campo: `resposta:${pergunta.chave}`,
            valorAnterior: existente.resposta,
            valorNovo: respostaNova,
            alteradoPor: usuarioId,
          });

          await db
            .update(questionarioAtividadesRespostas)
            .set({
              pergunta: pergunta.pergunta,
              resposta: respostaNova,
              ordem: pergunta.ordem,
            })
            .where(eq(questionarioAtividadesRespostas.id, existente.id));
        }
      }

      return { success: true, questionarioId };
    }),
});
