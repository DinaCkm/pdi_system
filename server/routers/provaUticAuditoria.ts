import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { assessmentProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const TIPOS_PERMITIDOS = [
  "troca_aba",
  "saida_tela_cheia",
  "interrupcao_compartilhamento",
  "compartilhamento_invalido",
  "multiplas_telas",
  "tentativa_conteudo_protegido",
  "tentativa_print_screen",
  "tempo_questao_esgotado",
  "retomada_pendentes",
  "ordem_aleatoria",
  "monitoramento_iniciado",
] as const;

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export const provaUticAuditoriaRouter = router({
  registrar: assessmentProcedure
    .input(z.object({
      tentativaId: z.number().int().positive(),
      tipo: z.enum(TIPOS_PERMITIDOS),
      detalhe: z.string().max(8000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });

      const tentativaResult = await db.execute(sql`
        SELECT id
          FROM prova_utic_tentativas
         WHERE id = ${input.tentativaId}
           AND colaborador_id = ${ctx.user.id}
         LIMIT 1
      `);
      if (!rowsOf<{ id: number }>(tentativaResult)[0]) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tentativa inválida para este participante." });
      }

      await db.execute(sql`
        INSERT INTO prova_utic_eventos (tentativa_id, tipo, detalhe)
        VALUES (${input.tentativaId}, ${input.tipo}, ${input.detalhe ?? null})
      `);
      return { registrado: true };
    }),
});
