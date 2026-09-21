import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import {
  departamentos,
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
