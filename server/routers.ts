import { z } from "zod";
import { notifyOwner } from "./_core/notification";
import { router, publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure } from "./_core/customTrpc"; // <--- IMPORT CORRIGIDO
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { authRouter } from "./authRouters"; // <--- CONECTANDO O NOVO LOGIN
import { actionsRouter } from "./modules/actionsRouter";
import { adjustmentRequestsRouter } from "./modules/adjustmentRequestsRouter";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { pdiAjustesRouter } from "./routers/pdi-ajustes.router";

// Mantendo os roteadores que já existiam
import { systemRouter } from "./_core/systemRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter, // <--- AQUI ESTÁ A MÁGICA DO LOGIN
  pdiAjustes: pdiAjustesRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,
  actions: actionsRouter,
  adjustmentRequests: adjustmentRequestsRouter,

  // MANTENDO A ESTRUTURA ORIGINAL DE DEPARTAMENTOS
  departamentos: router({
    list: adminProcedure.query(async () => {
      return await db.getAllDepartamentos();
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getDepartamentoById(input.id);
    }),
    create: adminProcedure.input(z.object({ nome: z.string(), descricao: z.string().optional(), leaderId: z.number().optional() })).mutation(async ({ input }) => {
      await db.createDepartamento(input);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({ id: z.number(), nome: z.string().optional(), leaderId: z.number().optional().nullable() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateDepartamento(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDepartamento(input.id);
      return { success: true };
    }),
  }),

  // MANTENDO USUÁRIOS
  users: router({
    list: adminProcedure.query(async () => await db.getAllUsers()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => await db.getUserById(input.id)),
    create: adminProcedure.input(z.object({ name: z.string(), email: z.string().email(), cpf: z.string(), role: z.enum(["admin", "lider", "colaborador"]), cargo: z.string(), departamentoId: z.number().optional() })).mutation(async ({ input }) => {
      const cpf = input.cpf.replace(/\D/g, "");
      await db.createUser({ ...input, cpf, openId: `local_${cpf}`, status: "ativo" });
      return { success: true };
    }),
    // Endpoint simplificado para não quebrar a tipagem antiga
    buscarPorCpf: publicProcedure.input(z.object({ cpf: z.string() })).query(async ({ input }) => {
       const users = await db.getAllUsers();
       return users.find(u => u.cpf?.replace(/\D/g, "") === input.cpf.replace(/\D/g, "")) || null;
    }),
    update: adminProcedure.input(z.object({ id: z.number(), leaderId: z.number().nullable().optional(), role: z.string().optional(), name: z.string().optional(), email: z.string().optional(), cargo: z.string().optional(), departamentoId: z.number().optional(), status: z.string().optional() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updateUser(id, data);
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.updateUser(input.id, { status: 'inativo' });
      return { success: true };
    }),
  }),

  // MANTENDO COMPETÊNCIAS E CICLOS (SIMPLIFICADO PARA O TESTE)
  competencias: router({
    listAllMacros: publicProcedure.query(async () => await db.getAllMacros()),
    create: adminProcedure.input(z.object({ nome: z.string(), descricao: z.string().optional() })).mutation(async ({ input }) => {
      await db.createMacro(input);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({ id: z.number(), nome: z.string(), descricao: z.string().optional() })).mutation(async ({ input }) => {
      await db.updateMacro(input.id, { nome: input.nome, descricao: input.descricao });
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteMacro(input.id);
      return { success: true };
    }),
  }),
  
  ciclos: router({
    list: protectedProcedure.query(async () => await db.getAllCiclos()),
  }),

  pdis: router({
    list: adminProcedure.query(async () => await db.getAllPDIs()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => await db.getPDIById(input.id)),
    myPDIs: protectedProcedure.query(async ({ ctx }) => {
      const allPDIs = await db.getAllPDIs();
      
      return allPDIs.filter((pdi: any) => {
        const pdiUserId = String(pdi.colaboradorId || pdi.usuarioId);
        const ctxUserId = String(ctx.user.id);
        return pdiUserId === ctxUserId;
      });
    }),
    teamPDIs: protectedProcedure.query(async ({ ctx }) => {
      // Buscar departamento do Lider
      const lider = await db.getUserById(Number(ctx.user.id));
      if (!lider || !lider.departamentoId) return [];
      
      // Buscar todos os usuarios do departamento (qualquer role)
      const allUsers = await db.getAllUsers();
      const teamUserIds = allUsers
        .filter(u => u.departamentoId === lider.departamentoId)
        .map(u => u.id);
      
      if (teamUserIds.length === 0) return [];
      
      // Retornar PDIs de usuarios do departamento
      const allPDIs = await db.getAllPDIs();
      return allPDIs.filter(pdi => teamUserIds.includes(Number(pdi.colaboradorId)));
    }),
    validate: protectedProcedure.input(z.object({ pdiId: z.number() })).mutation(async ({ input, ctx }) => {
      const pdi = await db.getPDIById(input.pdiId);
      if (!pdi) throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI nao encontrado' });
      
      if (ctx.user.role === 'lider') {
        const subordinates = await db.getSubordinates(Number(ctx.user.id));
        const subIds = subordinates.map(s => s.id);
        if (!subIds.includes(Number(pdi.colaboradorId))) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Voce nao pode validar PDI de outro departamento' });
        }
      }
      
      // Criar registro de validacao na tabela pdi_validacoes
      await db.createPDIValidacao({
        pdiId: input.pdiId,
        liderId: Number(ctx.user.id),
      });
      
      // Atualizar status do PDI para 'em_andamento'
      console.log(`[PDI.validate] Atualizando status do PDI ${input.pdiId} para em_andamento`);
      await db.updatePDIStatus(input.pdiId, 'em_andamento');
      console.log(`[PDI.validate] Status atualizado com sucesso`);
      
      return { success: true };
    }),
    create: protectedProcedure.input(z.object({ colaboradorId: z.number(), cicloId: z.number(), titulo: z.string(), objetivoGeral: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const pdiId = await db.createPDI({
        ...input,
        createdBy: Number(ctx.user.id),
      });
      return { success: true, pdiId };
    }),
  }),

  // ============= EVIDÊNCIAS (JÁ ATUALIZADO ANTERIORMENTE) =============
  evidences: router({
    create: protectedProcedure
      .input(z.object({ 
        actionId: z.number(), 
        descricao: z.string().optional(), 
        files: z.array(z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
          fileUrl: z.string(),
          fileKey: z.string()
        })).optional() 
      }))
      .mutation(async ({ ctx, input }) => {
        console.log('[evidences.create] INICIANDO - Input:', JSON.stringify(input, null, 2));
        console.log('[evidences.create] User ID:', ctx.user?.id, 'Role:', ctx.user?.role);
        
        try {
          // 1. Criar a evidência principal e capturar o ID (MySQL insertId)
          console.log('[evidences.create] Chamando db.createEvidence com:', { actionId: input.actionId, colaboradorId: ctx.user!.id, status: 'aguardando_avaliacao' });
          const evidenceId = await db.createEvidence({ 
            actionId: input.actionId, 
            colaboradorId: Number(ctx.user!.id), 
            descricao: input.descricao,
            status: 'aguardando_avaliacao'
          });
          console.log('[evidences.create] ✅ Evidence criada com ID:', evidenceId);
          
          // 2. Salvar os arquivos com todos os metadados
          if (input.files && input.files.length > 0) {
            console.log('[evidences.create] Salvando', input.files.length, 'arquivos...');
            for (const file of input.files) {
              console.log('[evidences.create] Arquivo recebido:', JSON.stringify(file, null, 2));
              if (!file.fileUrl) {
                console.error('[evidences.create] ERRO: fileUrl ausente');
                throw new Error('Arquivo sem URL');
              }
              await db.createEvidenceFile(evidenceId, file);
            }
          }
          
          // 3. Salvar o texto na tabela vinculada
          if (input.descricao) {
            console.log('[evidences.create] Salvando descrição...');
            await db.createEvidenceText(evidenceId, input.descricao);
          }
          
          // 4. Atualizar status da ação
          console.log('[evidences.create] Atualizando ação', input.actionId, 'para aguardando_avaliacao...');
          await db.updateAction(input.actionId, { status: 'aguardando_avaliacao' });
          
          console.log('[evidences.create] ✅ SUCESSO COMPLETO - Evidence ID:', evidenceId);
          return { success: true, evidenceId };
        } catch (error) {
          console.error('[evidences.create] ❌ ERRO CAPTURADO:', error);
          console.error('[evidences.create] Stack trace:', (error as any)?.stack);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao salvar evidência' });
        }
      }),
    listByAction: protectedProcedure.input(z.object({ actionId: z.number() })).query(async ({ input }) => await db.getEvidencesByActionId(input.actionId)),
    aprovar: adminProcedure.input(z.object({ evidenceId: z.number() })).mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.evidenceId);
        if(ev) {
            await db.updateEvidenceStatus(input.evidenceId, { status: 'aprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
            await db.updateAction(ev.actionId, { status: 'concluida' });
            
            // Notificar o proprietário sobre aprovação
            const action = await db.getActionById(ev.actionId);
            if(action) {
                await notifyOwner({
                    title: '✅ Evidência Aprovada',
                    content: `A evidência para a ação "${action.titulo}" foi aprovada pelo administrador.`
                });
            }
        }
        return { success: true };
    }),
    reprovar: adminProcedure.input(z.object({ evidenceId: z.number() })).mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.evidenceId);
        if(ev) {
            await db.updateEvidenceStatus(input.evidenceId, { status: 'reprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
            await db.updateAction(ev.actionId, { status: 'em_andamento' });
            
            // Notificar o proprietário sobre reprovação
            const action = await db.getActionById(ev.actionId);
            if(action) {
                await notifyOwner({
                    title: '❌ Evidência Reprovada',
                    content: `A evidência para a ação "${action.titulo}" foi reprovada. Por favor, envie uma nova evidência com as correções necessárias.`
                });
            }
        }
        return { success: true };
    }),
    getPending: adminProcedure.query(async () => {
      const rawEvidences = await db.getPendingEvidences();
      // Para cada evidência, buscamos os arquivos e textos vinculados
      return await Promise.all(
        rawEvidences.map(async (ev: any) => {
          const [files]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
          const [texts]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
          return { 
            ...ev, 
            files: files || [], 
            texts: texts || [] 
          };
        })
      );
    }),
    listPending: adminProcedure.query(async () => {
      const rawEvidences = await db.getPendingEvidences();
      // Para cada evidência, buscamos os arquivos e textos vinculados
      return await Promise.all(
        rawEvidences.map(async (ev: any) => {
          const [files]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
          const [texts]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
          return { 
            ...ev, 
            files: files || [], 
            texts: texts || [] 
          };
        })
      );
    }),
  })
});

export type AppRouter = typeof appRouter;
