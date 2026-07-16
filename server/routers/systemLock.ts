import { z } from "zod";
import { router, protectedProcedure, adminOrGerenteProcedure } from "../_core/customTrpc";
import * as db from "../db";
import { PDI_LOCK_DEFAULT_MESSAGE } from "@shared/const";

/**
 * Router de controle do "Período de Execução do PDI".
 * - getStatus: disponível a qualquer usuário logado (usado por banner/pop-up).
 * - lockNow / schedule / reactivate / updateMessage: restritos a admin e gerente.
 */
export const systemLockRouter = router({
  getStatus: protectedProcedure.query(async () => {
    const s = await db.getSystemSettings();
    const locked = await db.isPdiExecutionLocked();
    return {
      locked,
      manualLock: s.pdiExecutionLocked,
      scheduledAt: s.lockScheduledAt,
      message: s.lockMessage || PDI_LOCK_DEFAULT_MESSAGE,
      updatedAt: s.updatedAt,
    };
  }),

  // Bloqueia imediatamente o envio de documentos e solicitações de alteração.
  lockNow: adminOrGerenteProcedure
    .input(z.object({ message: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateSystemSettings({
        pdiExecutionLocked: true,
        lockScheduledAt: null,
        lockMessage: input.message?.trim() ? input.message.trim() : PDI_LOCK_DEFAULT_MESSAGE,
        updatedBy: ctx.user.id,
      });
      return { success: true };
    }),

  // Agenda uma data de encerramento; o bloqueio passa a valer automaticamente a partir dela.
  schedule: adminOrGerenteProcedure
    .input(z.object({ scheduledAt: z.date(), message: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await db.updateSystemSettings({
        pdiExecutionLocked: false,
        lockScheduledAt: input.scheduledAt,
        lockMessage: input.message?.trim() ? input.message.trim() : PDI_LOCK_DEFAULT_MESSAGE,
        updatedBy: ctx.user.id,
      });
      return { success: true };
    }),

  // Reativa o sistema (remove bloqueio manual e agendamento).
  reactivate: adminOrGerenteProcedure.mutation(async ({ ctx }) => {
    await db.updateSystemSettings({
      pdiExecutionLocked: false,
      lockScheduledAt: null,
      updatedBy: ctx.user.id,
    });
    return { success: true };
  }),

  // Atualiza somente a mensagem exibida aos usuários.
  updateMessage: adminOrGerenteProcedure
    .input(z.object({ message: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await db.updateSystemSettings({ lockMessage: input.message.trim(), updatedBy: ctx.user.id });
      return { success: true };
    }),
});
