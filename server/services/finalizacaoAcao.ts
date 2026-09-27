import { sql } from "drizzle-orm";
import * as db from "../db";
import { notifyOwner } from "../_core/notification";
import { sendEmailParabensEvidenciaAprovada } from "../_core/email";

// Ponto único para concluir uma ação do PDI: aprovação de evidência (admin ou líder),
// validação de impacto e, futuramente, conclusão de curso do EcoLíder.

export type OrigemFinalizacao =
  | "evidencia_admin"
  | "evidencia_lider"
  | "validacao_impacto"
  | "curso_ecolider";

const MOTIVO_POR_ORIGEM: Record<OrigemFinalizacao, string> = {
  evidencia_admin: "Evidência aprovada pelo administrador",
  evidencia_lider: "Evidência aprovada pelo líder",
  validacao_impacto: "Evidência e impacto validados pelo administrador",
  curso_ecolider: "Curso concluído no EcoLíder",
};

export type FinalizarAcaoParams = {
  actionId: number;
  colaboradorId: number;
  origem: OrigemFinalizacao;
  usuarioId?: number | null;
  aviso?: (acao: { titulo: string }) => { title: string; content: string };
  ignorarSeJaConcluida?: boolean;
};

export type FinalizarAcaoResultado = "concluida" | "ja_concluida" | "acao_nao_encontrada";

export async function finalizarAcao({
  actionId,
  colaboradorId,
  origem,
  usuarioId,
  aviso,
  ignorarSeJaConcluida = false,
}: FinalizarAcaoParams): Promise<FinalizarAcaoResultado> {
  const action = await db.getActionById(actionId);
  if (!action) return "acao_nao_encontrada";
  if (ignorarSeJaConcluida && action.status === "concluida") return "ja_concluida";

  const statusAnterior = action.status;
  await db.updateAction(actionId, { status: "concluida" });

  if (usuarioId && statusAnterior !== "concluida") {
    await db.createAcaoHistorico({
      actionId,
      campo: "Status",
      valorAnterior: statusAnterior ?? undefined,
      valorNovo: "concluida",
      motivoAlteracao: MOTIVO_POR_ORIGEM[origem],
      alteradoPor: usuarioId,
    });
  }

  if (aviso) {
    await notifyOwner(aviso({ titulo: action.titulo }));
  }

  // Enviar e-mail de parabéns ao colaborador e cópia ao líder
  try {
    const colaborador = await db.getUserById(colaboradorId);
    if (colaborador && colaborador.email) {
      const [pdiRows]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${actionId} LIMIT 1`);
      const tituloPdi = pdiRows?.[0]?.titulo || "PDI";

      let liderEmail: string | undefined;
      let liderName: string | undefined;
      if (colaborador.leaderId) {
        const lider = await db.getUserById(colaborador.leaderId);
        if (lider && lider.email) {
          liderEmail = lider.email;
          liderName = lider.name || "Líder";
        }
      }

      await sendEmailParabensEvidenciaAprovada({
        colaboradorEmail: colaborador.email,
        colaboradorName: colaborador.name || "Colaborador(a)",
        tituloAcao: action.titulo,
        tituloPdi,
        liderEmail,
        liderName,
      });
    }
  } catch (emailErr) {
    console.warn(`[finalizarAcao:${origem}] Erro ao enviar e-mail de parabéns:`, emailErr);
  }

  return "concluida";
}
