import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { departamentos, users } from "../../drizzle/schema";
import {
  organizacoes,
  funcoesOrganizacionais,
  usuariosFuncoesOrganizacionais,
} from "../../drizzle/comportamental-schema";

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

export const funcoesOrganizacionaisRouter = router({
  organizacoes: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    return db
      .select({
        id: organizacoes.id,
        nome: organizacoes.nome,
        nomeFantasia: organizacoes.nomeFantasia,
        codigo: organizacoes.codigo,
        ativa: organizacoes.ativa,
      })
      .from(organizacoes)
      .orderBy(desc(organizacoes.ativa), asc(organizacoes.nome));
  }),

  criarOrganizacao: adminProcedure
    .input(
      z.object({
        nome: z.string().trim().min(2).max(255),
        nomeFantasia: z.string().trim().max(255).optional().nullable(),
        codigo: z.string().trim().min(2).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await dbObrigatorio();
      const existente = await db
        .select({ id: organizacoes.id })
        .from(organizacoes)
        .where(eq(organizacoes.codigo, input.codigo))
        .limit(1);

      if (existente.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma organização com este código.",
        });
      }

      await db.insert(organizacoes).values({
        nome: input.nome,
        nomeFantasia: input.nomeFantasia ?? null,
        codigo: input.codigo,
        ativa: true,
      });

      return { success: true };
    }),

  listar: adminProcedure
    .input(
      z
        .object({
          organizacaoId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const base = db
        .select({
          id: funcoesOrganizacionais.id,
          organizacaoId: funcoesOrganizacionais.organizacaoId,
          organizacaoNome: organizacoes.nome,
          departamentoId: funcoesOrganizacionais.departamentoId,
          departamentoNome: departamentos.nome,
          nome: funcoesOrganizacionais.nome,
          codigo: funcoesOrganizacionais.codigo,
          cargoReferencia: funcoesOrganizacionais.cargoReferencia,
          descricao: funcoesOrganizacionais.descricao,
          origem: funcoesOrganizacionais.origem,
          versao: funcoesOrganizacionais.versao,
          vigenciaInicio: funcoesOrganizacionais.vigenciaInicio,
          vigenciaFim: funcoesOrganizacionais.vigenciaFim,
          ativa: funcoesOrganizacionais.ativa,
        })
        .from(funcoesOrganizacionais)
        .innerJoin(
          organizacoes,
          eq(funcoesOrganizacionais.organizacaoId, organizacoes.id),
        )
        .leftJoin(
          departamentos,
          eq(funcoesOrganizacionais.departamentoId, departamentos.id),
        );

      if (input?.organizacaoId) {
        return base
          .where(eq(funcoesOrganizacionais.organizacaoId, input.organizacaoId))
          .orderBy(
            desc(funcoesOrganizacionais.ativa),
            asc(departamentos.nome),
            asc(funcoesOrganizacionais.nome),
          );
      }

      return base.orderBy(
        desc(funcoesOrganizacionais.ativa),
        asc(departamentos.nome),
        asc(funcoesOrganizacionais.nome),
      );
    }),

  criar: adminProcedure
    .input(
      z.object({
        organizacaoId: z.number().int().positive(),
        departamentoId: z.number().int().positive().optional().nullable(),
        nome: z.string().trim().min(2).max(255),
        codigo: z.string().trim().max(100).optional().nullable(),
        cargoReferencia: z.string().trim().max(255).optional().nullable(),
        descricao: z.string().trim().max(5000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();
      await db.insert(funcoesOrganizacionais).values({
        organizacaoId: input.organizacaoId,
        departamentoId: input.departamentoId ?? null,
        nome: input.nome,
        codigo: input.codigo ?? null,
        cargoReferencia: input.cargoReferencia ?? null,
        descricao: input.descricao ?? null,
        origem: "VALIDACAO_ADMIN",
        versao: 1,
        ativa: true,
        createdBy: Number(ctx.user.id),
      });
      return { success: true };
    }),

  atualizar: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        departamentoId: z.number().int().positive().optional().nullable(),
        nome: z.string().trim().min(2).max(255),
        codigo: z.string().trim().max(100).optional().nullable(),
        cargoReferencia: z.string().trim().max(255).optional().nullable(),
        descricao: z.string().trim().max(5000).optional().nullable(),
        ativa: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await dbObrigatorio();
      await db
        .update(funcoesOrganizacionais)
        .set({
          departamentoId: input.departamentoId ?? null,
          nome: input.nome,
          codigo: input.codigo ?? null,
          cargoReferencia: input.cargoReferencia ?? null,
          descricao: input.descricao ?? null,
          ativa: input.ativa,
        })
        .where(eq(funcoesOrganizacionais.id, input.id));
      return { success: true };
    }),

  usuarios: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    return db
      .select({
        id: users.id,
        name: users.name,
        cargo: users.cargo,
        departamentoId: users.departamentoId,
        departamentoNome: departamentos.nome,
        vinculoId: usuariosFuncoesOrganizacionais.id,
        funcaoOrganizacionalId:
          usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
        funcaoNome: funcoesOrganizacionais.nome,
        tipoVinculo: usuariosFuncoesOrganizacionais.tipoVinculo,
      })
      .from(users)
      .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
      .leftJoin(
        usuariosFuncoesOrganizacionais,
        and(
          eq(usuariosFuncoesOrganizacionais.usuarioId, users.id),
          eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
          eq(usuariosFuncoesOrganizacionais.ativo, true),
        ),
      )
      .leftJoin(
        funcoesOrganizacionais,
        eq(
          usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
          funcoesOrganizacionais.id,
        ),
      )
      .where(eq(users.status, "ativo"))
      .orderBy(asc(departamentos.nome), asc(users.name));
  }),

  vincularPrincipal: adminProcedure
    .input(
      z.object({
        usuarioId: z.number().int().positive(),
        funcaoOrganizacionalId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();

      const funcao = await db
        .select({
          id: funcoesOrganizacionais.id,
          ativa: funcoesOrganizacionais.ativa,
        })
        .from(funcoesOrganizacionais)
        .where(eq(funcoesOrganizacionais.id, input.funcaoOrganizacionalId))
        .limit(1);

      if (!funcao[0]?.ativa) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A função selecionada não está ativa.",
        });
      }

      const usuario = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.usuarioId), eq(users.status, "ativo")))
        .limit(1);

      if (!usuario.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário ativo não encontrado.",
        });
      }

      await db.transaction(async tx => {
        await tx
          .update(usuariosFuncoesOrganizacionais)
          .set({
            ativo: false,
            vigenciaFim: new Date().toISOString().slice(0, 10),
          })
          .where(
            and(
              eq(usuariosFuncoesOrganizacionais.usuarioId, input.usuarioId),
              eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
              eq(usuariosFuncoesOrganizacionais.ativo, true),
            ),
          );

        await tx.insert(usuariosFuncoesOrganizacionais).values({
          usuarioId: input.usuarioId,
          funcaoOrganizacionalId: input.funcaoOrganizacionalId,
          tipoVinculo: "PRINCIPAL",
          origem: "VALIDACAO_ADMIN",
          vigenciaInicio: new Date().toISOString().slice(0, 10),
          ativo: true,
          createdBy: Number(ctx.user.id),
        });
      });

      return { success: true };
    }),
});
