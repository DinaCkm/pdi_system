import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/customTrpc";
import { getDb, getSubordinates } from "../db";
import { montarRelatorioEmpregado } from "../../shared/relatorioEmpregadoRegras";
import { carregarBaseRelatorio } from "../services/relatorioEmpregado";
import { importarLote2025, situacao2025 } from "../services/pdi2025";

// Relatório gerencial do empregado no PDI.
// Líder: só os empregados da própria equipe. Administrador e gerente (RH): todos.
// Empregado (colaborador) não acessa.

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  return db;
}

const PODE_VER_TODOS = new Set(["admin", "Administrador", "gerente"]);

async function garantirAcesso(user: { id: number; role: string }, colaboradorId: number) {
  if (PODE_VER_TODOS.has(String(user.role))) return;
  if (user.role === "lider") {
    const equipe = await getSubordinates(Number(user.id));
    if (equipe.some((p: any) => Number(p.id) === Number(colaboradorId))) return;
    throw new TRPCError({ code: "FORBIDDEN", message: "Este empregado não pertence à sua equipe." });
  }
  throw new TRPCError({ code: "FORBIDDEN", message: "Relatório disponível só para a liderança e a administração." });
}

const hojeSaoPaulo = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

const acao2025 = z.object({
  email: z.string().max(320),
  area: z.string().max(255).nullable(),
  tipo: z.enum(["COMPORTAMENTAL", "TECNICA"]).nullable(),
  competencia: z.string().max(255).nullable(),
  acao: z.string().min(1).max(400),
  tipoAcao: z.string().max(100).nullable(),
  prazo: z.string().max(10).nullable(),
  concluidoEm: z.string().max(10).nullable(),
  finalizada: z.boolean(),
});
const area2025 = z.object({
  email: z.string().max(320),
  area: z.string().min(1).max(255),
  tipo: z.enum(["COMPORTAMENTAL", "TECNICA"]).nullable(),
  competencia: z.string().max(255).nullable(),
  categoria: z.string().max(60).nullable(),
  criadoEm: z.string().max(10).nullable(),
  atualizadoEm: z.string().max(10).nullable(),
  progresso: z.string().max(40).nullable(),
  totalAcoes: z.number().nullable(),
  finalizadas: z.number().nullable(),
});
const resumo2025 = z.object({
  email: z.string().max(320),
  nome: z.string().max(255),
  time: z.string().max(255).nullable(),
  lider: z.string().max(255).nullable(),
  aprovadoLider: z.string().max(20).nullable(),
  totalAreas: z.number().nullable(),
  naoIniciadas: z.number().nullable(),
  emProgresso: z.number().nullable(),
  finalizadas: z.number().nullable(),
  pdiFinalizado: z.string().max(40).nullable(),
  atualizadoEm: z.string().max(10).nullable(),
});

export const relatorioEmpregadoRouter = router({
  relatorio: protectedProcedure.input(z.object({ colaboradorId: z.number().int().positive() })).query(async ({ input, ctx }) => {
    await garantirAcesso(ctx.user as any, input.colaboradorId);
    const db = await dbObrigatorio();
    const base = await carregarBaseRelatorio(db, ctx, input.colaboradorId, hojeSaoPaulo());
    return montarRelatorioEmpregado(base);
  }),

  situacaoPdi2025: adminProcedure.query(async () => situacao2025(await dbObrigatorio())),

  // A planilha é lida no navegador e enviada em lotes (cada lote só insere; repetir não duplica).
  importarPdi2025: adminProcedure
    .input(
      z.object({
        resumos: z.array(resumo2025).max(1000),
        areas: z.array(area2025).max(3000),
        acoes: z.array(acao2025).max(3000),
      }),
    )
    .mutation(async ({ input }) => importarLote2025(await dbObrigatorio(), input)),
});
