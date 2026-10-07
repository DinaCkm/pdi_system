import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const CAMPANHA_VERSAO = 1;

function rowsOf<T = any>(result: any): T[] {
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

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

export const recadastramentoProfissionalRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbObrigatorio();
    const usuarioId = Number(ctx.user.id);

    const userResult = await db.execute(sql`
      SELECT id, name, email, cargo, role, departamentoId
        FROM users
       WHERE id = ${usuarioId}
       LIMIT 1
    `);
    const usuario = rowsOf<any>(userResult)[0];
    if (!usuario) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
    }

    const vinculoResult = await db.execute(sql`
      SELECT ufo.funcao_organizacional_id AS funcaoId,
             fo.nome AS funcaoNome
        FROM usuarios_funcoes_organizacionais ufo
        JOIN funcoes_organizacionais fo ON fo.id = ufo.funcao_organizacional_id
       WHERE ufo.usuario_id = ${usuarioId}
         AND ufo.tipo_vinculo = 'PRINCIPAL'
         AND ufo.ativo = TRUE
         AND fo.ativa = TRUE
       ORDER BY ufo.updated_at DESC, ufo.id DESC
       LIMIT 1
    `);
    const funcaoAtual = rowsOf<any>(vinculoResult)[0] ?? null;

    const recadResult = await db.execute(sql`
      SELECT id,
             cargo_confirmado AS cargoConfirmado,
             funcao_confirmada_id AS funcaoConfirmadaId,
             perfil_confirmado_em AS perfilConfirmadoEm,
             eixos_confirmados_em AS eixosConfirmadosEm
        FROM recadastramento_profissional
       WHERE usuario_id = ${usuarioId}
         AND campanha_versao = ${CAMPANHA_VERSAO}
       LIMIT 1
    `);
    const recad = rowsOf<any>(recadResult)[0] ?? null;

    const admin = String(usuario.role) === "admin";
    const perfilConcluido = admin || Boolean(recad?.perfilConfirmadoEm);
    const eixosConcluidos = admin || Boolean(recad?.eixosConfirmadosEm);

    return {
      campanhaVersao: CAMPANHA_VERSAO,
      obrigatorio: !admin,
      usuario: {
        id: Number(usuario.id),
        nome: usuario.name ?? "",
        email: usuario.email ?? "",
        cargoAtual: usuario.cargo ?? "",
        departamentoId: usuario.departamentoId ? Number(usuario.departamentoId) : null,
      },
      funcaoAtual: funcaoAtual
        ? { id: Number(funcaoAtual.funcaoId), nome: String(funcaoAtual.funcaoNome) }
        : null,
      perfilConcluido,
      eixosConcluidos,
      concluido: perfilConcluido && eixosConcluidos,
      proximaEtapa: !perfilConcluido ? "PERFIL" : !eixosConcluidos ? "EIXOS" : "CONCLUIDO",
    };
  }),

  opcoes: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbObrigatorio();
    const usuarioId = Number(ctx.user.id);

    const userResult = await db.execute(sql`
      SELECT departamentoId
        FROM users
       WHERE id = ${usuarioId}
       LIMIT 1
    `);
    const usuario = rowsOf<any>(userResult)[0] ?? null;
    const departamentoId = usuario?.departamentoId ? Number(usuario.departamentoId) : null;

    const cargosResult = await db.execute(sql`
      SELECT cargo
        FROM (
          SELECT TRIM(cargo) AS cargo
            FROM users
           WHERE cargo IS NOT NULL AND TRIM(cargo) <> ''
          UNION
          SELECT TRIM(cargo_referencia) AS cargo
            FROM funcoes_organizacionais
           WHERE ativa = TRUE
             AND cargo_referencia IS NOT NULL
             AND TRIM(cargo_referencia) <> ''
        ) c
       ORDER BY cargo
    `);

    const funcoesResult = departamentoId
      ? await db.execute(sql`
          SELECT id, nome, cargo_referencia AS cargoReferencia, departamento_id AS departamentoId
            FROM funcoes_organizacionais
           WHERE ativa = TRUE
             AND (departamento_id = ${departamentoId} OR departamento_id IS NULL)
           ORDER BY nome
        `)
      : await db.execute(sql`
          SELECT id, nome, cargo_referencia AS cargoReferencia, departamento_id AS departamentoId
            FROM funcoes_organizacionais
           WHERE ativa = TRUE
           ORDER BY nome
        `);

    return {
      cargos: rowsOf<any>(cargosResult).map(item => String(item.cargo)),
      funcoes: rowsOf<any>(funcoesResult).map(item => ({
        id: Number(item.id),
        nome: String(item.nome),
        cargoReferencia: item.cargoReferencia ? String(item.cargoReferencia) : null,
        departamentoId: item.departamentoId ? Number(item.departamentoId) : null,
      })),
    };
  }),

  confirmarPerfil: protectedProcedure
    .input(
      z.object({
        cargo: z.string().trim().min(2).max(255),
        funcaoId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();
      const usuarioId = Number(ctx.user.id);

      const userResult = await db.execute(sql`
        SELECT cargo, departamentoId
          FROM users
         WHERE id = ${usuarioId}
         LIMIT 1
      `);
      const usuario = rowsOf<any>(userResult)[0];
      if (!usuario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Usuário não encontrado." });
      }

      const funcaoResult = await db.execute(sql`
        SELECT id, nome, departamento_id AS departamentoId
          FROM funcoes_organizacionais
         WHERE id = ${input.funcaoId}
           AND ativa = TRUE
         LIMIT 1
      `);
      const funcao = rowsOf<any>(funcaoResult)[0];
      if (!funcao) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Função selecionada não está disponível." });
      }

      const departamentoUsuario = usuario.departamentoId ? Number(usuario.departamentoId) : null;
      const departamentoFuncao = funcao.departamentoId ? Number(funcao.departamentoId) : null;
      if (departamentoFuncao && departamentoUsuario && departamentoFuncao !== departamentoUsuario) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A função selecionada pertence a outra unidade/departamento.",
        });
      }

      const anteriorResult = await db.execute(sql`
        SELECT funcao_organizacional_id AS funcaoId
          FROM usuarios_funcoes_organizacionais
         WHERE usuario_id = ${usuarioId}
           AND tipo_vinculo = 'PRINCIPAL'
           AND ativo = TRUE
         ORDER BY updated_at DESC, id DESC
         LIMIT 1
      `);
      const funcaoAnteriorId = rowsOf<any>(anteriorResult)[0]?.funcaoId ?? null;

      await db.execute(sql`
        INSERT INTO recadastramento_profissional
          (usuario_id, campanha_versao, cargo_anterior, cargo_confirmado,
           funcao_anterior_id, funcao_confirmada_id, perfil_confirmado_em)
        VALUES
          (${usuarioId}, ${CAMPANHA_VERSAO}, ${usuario.cargo ?? null}, ${input.cargo},
           ${funcaoAnteriorId}, ${input.funcaoId}, NOW())
        ON DUPLICATE KEY UPDATE
          cargo_confirmado = VALUES(cargo_confirmado),
          funcao_confirmada_id = VALUES(funcao_confirmada_id),
          perfil_confirmado_em = NOW(),
          updated_at = NOW()
      `);

      await db.execute(sql`
        UPDATE users
           SET cargo = ${input.cargo},
               updatedAt = NOW()
         WHERE id = ${usuarioId}
      `);

      await db.execute(sql`
        UPDATE usuarios_funcoes_organizacionais
           SET ativo = FALSE,
               vigencia_fim = CURDATE(),
               updated_at = NOW()
         WHERE usuario_id = ${usuarioId}
           AND tipo_vinculo = 'PRINCIPAL'
           AND ativo = TRUE
           AND funcao_organizacional_id <> ${input.funcaoId}
      `);

      const existenteResult = await db.execute(sql`
        SELECT id
          FROM usuarios_funcoes_organizacionais
         WHERE usuario_id = ${usuarioId}
           AND funcao_organizacional_id = ${input.funcaoId}
           AND tipo_vinculo = 'PRINCIPAL'
         ORDER BY id DESC
         LIMIT 1
      `);
      const existente = rowsOf<any>(existenteResult)[0] ?? null;

      if (existente) {
        await db.execute(sql`
          UPDATE usuarios_funcoes_organizacionais
             SET ativo = TRUE,
                 origem = 'QUESTIONARIO',
                 vigencia_inicio = COALESCE(vigencia_inicio, CURDATE()),
                 vigencia_fim = NULL,
                 updated_at = NOW()
           WHERE id = ${Number(existente.id)}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO usuarios_funcoes_organizacionais
            (usuario_id, funcao_organizacional_id, tipo_vinculo, origem,
             vigencia_inicio, ativo, created_by)
          VALUES
            (${usuarioId}, ${input.funcaoId}, 'PRINCIPAL', 'QUESTIONARIO',
             CURDATE(), TRUE, ${usuarioId})
        `);
      }

      return { success: true, proximaEtapa: "EIXOS" as const };
    }),

  confirmarEixos: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await dbObrigatorio();
    const usuarioId = Number(ctx.user.id);

    const recadResult = await db.execute(sql`
      SELECT id, perfil_confirmado_em AS perfilConfirmadoEm
        FROM recadastramento_profissional
       WHERE usuario_id = ${usuarioId}
         AND campanha_versao = ${CAMPANHA_VERSAO}
       LIMIT 1
    `);
    const recad = rowsOf<any>(recadResult)[0];
    if (!recad?.perfilConfirmadoEm) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Confirme primeiro seu perfil profissional.",
      });
    }

    await db.execute(sql`
      UPDATE recadastramento_profissional
         SET eixos_confirmados_em = NOW(),
             updated_at = NOW()
       WHERE usuario_id = ${usuarioId}
         AND campanha_versao = ${CAMPANHA_VERSAO}
    `);

    return { success: true };
  }),
});
