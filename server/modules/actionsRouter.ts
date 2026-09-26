import { z } from "zod";
import { router, protectedProcedure } from "../_core/customTrpc";
import * as db from "../db";
import { actions as acoes } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateCertificate } from "./certificateGenerator";
import {
  COMPETENCIAS_COMPORTAMENTAIS_AD,
  colaboradorDoPdi,
  eixosTecnicosDoColaborador,
  ensureAcoesLastroSchema,
  gravarLastro,
  lastroDasAcoes,
} from "../services/acoesLastro";

let technicalActionSchemaReady = false;

async function ensureTechnicalActionSchema() {
  if (technicalActionSchemaReady) return;
  const conn = await db.getDb();
  if (!conn) throw new Error("Database not available");

  const result = await conn.execute(sql`
    SELECT IS_NULLABLE AS isNullable
      FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'actions'
       AND COLUMN_NAME = 'macroId'
     LIMIT 1
  `);
  const rows = Array.isArray((result as any)?.[0]) ? (result as any)[0] : result;
  const isNullable = String(rows?.[0]?.isNullable ?? "").toUpperCase() === "YES";

  if (!isNullable) {
    await conn.execute(sql`ALTER TABLE actions MODIFY COLUMN macroId INT NULL`);
  }
  technicalActionSchemaReady = true;
}

// Router de Ações Simplificado
export const actionsRouter = router({
  
  // Lista todas as ações (com controle de permissão)
  list: protectedProcedure
    .input(z.object({ pdiId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
    const user = ctx.user!;
    const pdiId = input?.pdiId;
    
    // LOG PARA DIAGNÓSTICO
    console.log("[actions.list] Usuário:", { id: user.id, role: user.role, tipo: typeof user.id, pdiId });
    
    if (pdiId) {
      // Se pdiId foi fornecido, buscar ações desse PDI
      const allActions = await db.getAllActions();
      return allActions.filter((a: any) => a.pdiId === pdiId);
    }
    
    if (user.role === "admin" || user.role === "gerente") {
      // Admin e Gerente vêem todas as ações
      const allActions = await db.getAllActions();
      console.log("[actions.list] Admin/Gerente vendo todas as ações:", allActions.length);
      return allActions;
    } else {
      // Colaborador vê apenas suas próprias ações
      const userActions = await db.getActionsByColaboradorId(user.id);
      console.log("[actions.list] Ações do colaborador", user.id, ":", userActions.length);
      if (userActions.length === 0) {
        // Tenta buscar todas e filtrar manualmente
        const allActions = await db.getAllActions();
        console.log("[actions.list] Total de ações no banco:", allActions.length);
        console.log("[actions.list] Primeiras ações:", allActions.slice(0, 2).map((a: any) => ({ id: a.id, responsavelId: a.responsavelId, usuarioId: a.usuarioId })));
        
        // Comparação flexível
        const filtered = allActions.filter((acao: any) => {
          const acaoUserId = String(acao.responsavelId || acao.usuarioId);
          const ctxUserId = String(user.id);
          return acaoUserId === ctxUserId;
        });
        console.log("[actions.list] Ações filtradas manualmente:", filtered.length);
        return filtered;
      }
      return userActions;
    }
  }),

  // Histórico real de ações do empregado vinculado ao PDI selecionado
  historyForPdi: protectedProcedure
    .input(z.object({ pdiId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "lider" && ctx.user.role !== "gerente") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para consultar o histórico de ações." });
      }

      const pdi = await db.getPDIById(input.pdiId);
      if (!pdi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "PDI não encontrado." });
      }

      const colaboradorId = Number((pdi as any).colaboradorId);
      if (!colaboradorId) return [];

      return await db.getActionsByColaboradorId(colaboradorId);
    }),

  // Biblioteca dinâmica: modelos consolidados a partir das ações já existentes.
  // O modelo é só o conteúdo (título + descrição). O tipo e o eixo pertencem a cada uso no PDI;
  // por isso cada modelo informa em quais eixos já foi usado ("usos").
  library: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin" && ctx.user.role !== "lider" && ctx.user.role !== "gerente") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para consultar a biblioteca de ações." });
    }
    await ensureAcoesLastroSchema();

    const actions = await db.getAllActions();
    const lastro = await lastroDasAcoes();
    const modelos = new Map<string, any>();

    for (const action of actions as any[]) {
      const titulo = String(action.titulo ?? "").trim();
      if (!titulo) continue;
      const descricao = String(action.descricao ?? "").trim();
      const chave = [titulo.toLocaleLowerCase("pt-BR"), descricao.toLocaleLowerCase("pt-BR")].join("|");
      const info = lastro.get(Number(action.id));
      const tipo = info?.tipo ?? null;
      const eixo = String(info?.eixo ?? "").trim() || null;
      let modelo = modelos.get(chave);
      if (!modelo) {
        modelo = {
          modeloId: Number(action.id),
          titulo,
          descricao,
          macroId: Number(action.macroId ?? 0) || null,
          microcompetencia: String(action.microcompetencia ?? "").trim(),
          utilizacoes: 0,
          usos: new Map<string, { tipoCompetencia: string; eixoNome: string; vezes: number }>(),
        };
        modelos.set(chave, modelo);
      }
      modelo.utilizacoes += 1;
      if (tipo && eixo) {
        const k = `${tipo}|${eixo}`;
        const uso = modelo.usos.get(k) ?? { tipoCompetencia: tipo, eixoNome: eixo, vezes: 0 };
        uso.vezes += 1;
        modelo.usos.set(k, uso);
      }
    }

    return Array.from(modelos.values())
      .map((modelo) => {
        const usos = (Array.from(modelo.usos.values()) as Array<{ tipoCompetencia: string; eixoNome: string; vezes: number }>).sort((a, b) => b.vezes - a.vezes);
        return {
          ...modelo,
          usos,
          tipoCompetencia: usos[0]?.tipoCompetencia ?? null,
          eixoNome: usos[0]?.eixoNome ?? null,
        };
      })
      .sort((a, b) => b.utilizacoes - a.utilizacoes || a.titulo.localeCompare(b.titulo, "pt-BR"));
  }),

  // Eixos que podem receber ação no PDI: técnicos da matriz do empregado + competências da AD.
  eixosDisponiveis: protectedProcedure
    .input(z.object({ pdiId: z.number() }))
    .query(async ({ input }) => {
      const colaboradorId = await colaboradorDoPdi(input.pdiId);
      const tecnicos = colaboradorId ? await eixosTecnicosDoColaborador(colaboradorId) : [];
      return { tecnicos, comportamentais: [...COMPETENCIAS_COMPORTAMENTAIS_AD] };
    }),

  // Importa o lastro (tipo + eixo) das ações já existentes, a partir dos modelos da biblioteca.
  // Cada linha aponta o ID do modelo (ação representante); todas as ações com o mesmo título,
  // descrição, macro e microcompetência recebem o mesmo tipo e eixo. Nada mais é alterado.
  importarLastro: protectedProcedure
    .input(z.object({
      linhas: z.array(z.object({
        modeloId: z.number().int().positive(),
        tipoCompetencia: z.enum(["TECNICA", "COMPORTAMENTAL"]),
        eixoNome: z.string().min(1).max(255),
      })).min(1).max(5000),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem importar o lastro das ações." });
      }
      await ensureAcoesLastroSchema();
      const conn = await db.getDb();
      if (!conn) throw new Error("Database not available");

      const erros: string[] = [];
      let modelosAtualizados = 0;
      let acoesAtualizadas = 0;
      for (const linha of input.linhas) {
        const eixo = linha.eixoNome.trim();
        if (linha.tipoCompetencia === "COMPORTAMENTAL" && !COMPETENCIAS_COMPORTAMENTAIS_AD.includes(eixo)) {
          erros.push(`Modelo ${linha.modeloId}: "${eixo}" não é uma competência da Avaliação de Desempenho.`);
          continue;
        }
        const repResult = await conn.execute(sql`
          SELECT titulo, descricao, macroId, microcompetencia FROM actions WHERE id = ${linha.modeloId} LIMIT 1
        `);
        const rep = (Array.isArray((repResult as any)?.[0]) ? (repResult as any)[0] : repResult)?.[0];
        if (!rep) {
          erros.push(`Modelo ${linha.modeloId}: ação não encontrada.`);
          continue;
        }
        const upd = await conn.execute(sql`
          UPDATE actions
             SET tipo_competencia = ${linha.tipoCompetencia}, eixo_nome = ${eixo}
           WHERE TRIM(titulo) = TRIM(${rep.titulo})
             AND COALESCE(TRIM(descricao), '') = COALESCE(TRIM(${rep.descricao}), '')
             AND COALESCE(macroId, 0) = COALESCE(${rep.macroId}, 0)
             AND COALESCE(TRIM(microcompetencia), '') = COALESCE(TRIM(${rep.microcompetencia}), '')
        `);
        const afetadas = Number((upd as any)?.[0]?.affectedRows ?? (upd as any)?.affectedRows ?? 0);
        modelosAtualizados += 1;
        acoesAtualizadas += afetadas;
      }
      return { modelosAtualizados, acoesAtualizadas, erros };
    }),

  // Obter ação por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionById(input.id);
    }),

  // Obter ação por ID (sem autenticação para testes)
  getByIdPublic: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionById(input.id);
    }),

  // Minhas ações (ações do usuário logado)
  myActions: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    console.log("[actions.myActions] Buscando ações para usuário:", user.id);
    
    const actions = await db.getActionsByColaboradorId(user.id);
    console.log("[actions.myActions] Encontradas", actions.length, "ações");
    return actions;
  }),

  // Criar ação
  create: protectedProcedure
    .input(z.object({
      titulo: z.string(),
      descricao: z.string().optional(),
      pdiId: z.number(),
      prazo: z.string(),
      macroId: z.number().optional(),
      microcompetencia: z.string().optional(),
      tipoCompetencia: z.enum(['TECNICA', 'COMPORTAMENTAL']),
      eixoNome: z.string().min(1).max(255),
      focoBem: z.string().max(255).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'lider') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      
      let prazoDate: Date;
      if (typeof input.prazo === 'string') {
        prazoDate = new Date(input.prazo);
      } else {
        prazoDate = input.prazo as Date;
      }
      
      await ensureAcoesLastroSchema();
      const eixo = input.eixoNome.trim();
      if (input.tipoCompetencia === 'COMPORTAMENTAL') {
        if (!COMPETENCIAS_COMPORTAMENTAIS_AD.includes(eixo)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `"${eixo}" não é uma competência comportamental da Avaliação de Desempenho.` });
        }
      } else {
        const colaboradorId = await colaboradorDoPdi(input.pdiId);
        const eixosDoEmpregado = colaboradorId ? await eixosTecnicosDoColaborador(colaboradorId) : [];
        if (!eixosDoEmpregado.includes(eixo)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: `O eixo técnico "${eixo}" não está na matriz deste empregado.` });
        }
      }

      // Ações novas não usam macro nem microcompetência: o vínculo é o tipo + eixo.
      const actionId = await db.createAction({
        pdiId: input.pdiId,
        macroId: null,
        microcompetencia: null,
        titulo: input.titulo,
        descricao: input.descricao,
        prazo: prazoDate,
        status: 'nao_iniciada',
      });
      await gravarLastro(Number(actionId), input.tipoCompetencia, eixo, input.focoBem?.trim() || null);

      console.log('[actions.create] Ação criada com ID:', actionId);
      return { success: true, id: actionId };
    }),

  // Atualizar ação
  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      titulo: z.string().optional(),
      descricao: z.string().optional(),
      status: z.string().optional(),
      prazo: z.string().optional(),
      macroId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin' && ctx.user.role !== 'lider') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Sem permissão' });
      }
      
      const { id, ...data } = input;
      await db.updateAction(id, data, Number(ctx.user.id));
      
      console.log('[actions.update] Ação atualizada:', id);
      return { success: true };
    }),

  // Deletar ação
  delete: protectedProcedure
    .input(z.object({ id: z.number(), motivoExclusao: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admin' });
      }
      
      await db.deleteAction(
        input.id,
        ctx.user.id,
        ctx.user.name || 'Admin',
        input.motivoExclusao
      );
      
      console.log('[actions.delete] Ação deletada com auditoria:', input.id);
      return { success: true };
    }),

  // Obter ação por ID com detalhes completos
  getWithDetails: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionById(input.id);
    }),

  // Obter ajustes pendentes
  getPendingAdjustments: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustmentRequests?.() || [];
    return allAdjustments.filter((adj: any) => adj.status === 'pendente');
  }),

  // Obter ajustes pendentes com detalhes
  getPendingAdjustmentsWithDetails: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustmentRequests?.() || [];
    return allAdjustments.filter((adj: any) => adj.status === 'pendente');
  }),

  // Obter ajustes pendentes por líder
  getPendingAdjustmentsByLeader: protectedProcedure.query(async ({ ctx }) => {
    const allAdjustments = await db.getAllAdjustmentRequests?.() || [];
    return allAdjustments.filter((adj: any) => String(adj.liderId) === String(ctx.user.id));
  }),

  // Obter histórico de ajustes
  getHistorico: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      return await db.getActionHistory(input.actionId);
    }),

  // Obter histórico de uma ação
  getHistory: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .query(async ({ input }) => {
      const history = await db.getActionHistory(input.actionId);
      return history.map((entry: any) => ({
        id: entry.id,
        actionId: entry.actionId,
        campoAlterado: entry.campo,
        valorAntigo: entry.valorAnterior,
        valorNovo: entry.valorNovo,
        motivo: entry.motivoAlteracao,
        mudadoPor: entry.alteradoPor ? "usuario" : "sistema",
        usuarioNome: entry.userName,
        dataMudanca: entry.createdAt
      }));
    }),

  // Ações da equipe do líder
  teamActions: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user!;
    
    if (user.role !== 'lider') {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas líderes podem acessar ações da equipe' });
    }

    const subordinates = await db.getSubordinates(Number(user.id));
    const subIds = subordinates.map((s: { id: number }) => s.id);

    if (subIds.length === 0) return [];

    const allActions = await db.getAllActions();
    const filtered = allActions.filter((acao: any) => {
      const acaoColabId = Number(acao.responsavelId || acao.usuarioId || acao.colaboradorId);
      return subIds.includes(acaoColabId);
    });
    
    // Enriquecer com nome da macrocompetência
    const enriched = await Promise.all(filtered.map(async (acao: any) => {
      if (acao.macroId) {
        const macro = await db.getMacroById(acao.macroId);
        return { ...acao, macroNome: macro?.nome || 'Sem competência' };
      }
      return { ...acao, macroNome: 'Sem competência' };
    }));
    
    return enriched;
  }),

  // Aprovar ajuste
  aprovarAjuste: protectedProcedure
    .input(z.object({ adjustmentId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas admin pode aprovar' });
      }
      return { success: true };
    }),

  // Gerar certificado de conclusão de ação
  generateCertificate: protectedProcedure
    .input(z.object({ actionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const user = ctx.user!;
      
      // Buscar a ação
      const action = await db.getActionById(input.actionId);
      if (!action) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
      }
      
      // Verificar se a ação está concluída
      if (action.status !== 'concluida') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas ações concluídas podem gerar certificado' });
      }
      
      // Buscar nome da macro competência
      let competenciaNome: string | undefined;
      if (action.macroId) {
        const macro = await db.getMacroById(action.macroId);
        competenciaNome = macro?.nome;
      }
      
      // Buscar título do PDI
      let pdiTitulo: string | undefined;
      if (action.pdiId) {
        const pdi = await db.getPDIById(action.pdiId);
        pdiTitulo = pdi?.titulo;
      }
      
      // Formatar data de conclusão
      const dataConclusao = action.updatedAt 
        ? new Date(action.updatedAt).toLocaleDateString('pt-BR')
        : new Date().toLocaleDateString('pt-BR');
      
      // Gerar o certificado
      const { url, key } = await generateCertificate({
        nomeColaborador: user.name || 'Colaborador',
        tituloAcao: action.titulo,
        competencia: competenciaNome,
        dataConclusao,
        pdiTitulo,
      });
      
      console.log('[actions.generateCertificate] Certificado gerado:', { actionId: input.actionId, url });
      
      return { url, key };
    }),

  // Listar ações concluídas (para admin e gerente)
  listConcluidas: protectedProcedure.query(async () => {
    return await db.getAcoesConcluidas();
  }),
});
