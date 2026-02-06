import { z } from "zod";
import { sql } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";
import { router, publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure, adminOrGerenteProcedure } from "./_core/customTrpc"; // <--- IMPORT CORRIGIDO
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { authRouter } from "./authRouters"; // <--- CONECTANDO O NOVO LOGIN
import { actionsRouter } from "./modules/actionsRouter";
import { adjustmentRequestsRouter } from "./modules/adjustmentRequestsRouter";
import { dashboardRouter } from "./routers/dashboard";
import { notificationsRouter } from "./routers/notifications";
import { pdiAjustesRouter } from "./routers/pdi-ajustes.router";
import { invokeLLM } from "./_core/llm";

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
    list: adminOrGerenteProcedure.query(async () => {
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
      const { id, leaderId, ...rest } = input;
      await db.updateDepartamento(id, { ...rest, leaderId: leaderId ?? undefined });
      return { success: true };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deleteDepartamento(input.id);
      return { success: true };
    }),
  }),

  // MANTENDO USUÁRIOS
  users: router({
    list: adminOrGerenteProcedure.query(async () => await db.getAllUsers()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => await db.getUserById(input.id)),
    create: adminProcedure.input(z.object({ name: z.string(), email: z.string().email(), cpf: z.string(), role: z.enum(["admin", "gerente", "lider", "colaborador"]), cargo: z.string(), departamentoId: z.number().nullable().optional() })).mutation(async ({ input }) => {
      const cpf = input.cpf.replace(/\D/g, "");
      await db.createUser({ ...input, cpf, openId: `local_${cpf}`, status: "ativo" });
      return { success: true };
    }),
    // Endpoint simplificado para não quebrar a tipagem antiga
    buscarPorCpf: publicProcedure.input(z.object({ cpf: z.string() })).query(async ({ input }) => {
       const users = await db.getAllUsers();
       return users.find((u: { cpf?: string | null }) => u.cpf?.replace(/\D/g, "") === input.cpf.replace(/\D/g, "")) || null;
    }),
    update: adminProcedure.input(z.object({ id: z.number(), leaderId: z.number().nullable().optional(), role: z.enum(["admin", "gerente", "lider", "colaborador"]).optional(), name: z.string().optional(), email: z.string().optional(), cargo: z.string().optional(), departamentoId: z.number().nullable().optional(), status: z.string().optional() })).mutation(async ({ input }) => {
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
    getTop3CompetenciasComGaps: adminProcedure.query(async () => await db.getTop3CompetenciasComGaps()),
    create: adminProcedure.input(z.object({ nome: z.string(), descricao: z.string().optional() })).mutation(async ({ input }) => {
      await db.createMacro({ nome: input.nome, descricao: input.descricao || '' });
      return { success: true };
    }),
    update: adminProcedure.input(z.object({ id: z.number(), nome: z.string(), descricao: z.string().optional() })).mutation(async ({ input }) => {
      await db.updateMacro(input.id, { nome: input.nome, descricao: input.descricao || '' });
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
    list: adminOrGerenteProcedure.query(async () => await db.getAllPDIs()),
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
      // Buscar subordinados diretos do Líder (usuários que têm leaderId = id do líder logado)
      const subordinates = await db.getSubordinates(Number(ctx.user.id));
      const teamUserIds = subordinates.map((u: { id: number }) => u.id);
      
      if (teamUserIds.length === 0) return [];
      
      // Retornar PDIs dos subordinados diretos
      const allPDIs = await db.getAllPDIs();
      return allPDIs.filter(pdi => teamUserIds.includes(Number(pdi.colaboradorId)));
    }),
    validate: protectedProcedure.input(z.object({ pdiId: z.number() })).mutation(async ({ input, ctx }) => {
      const pdi = await db.getPDIById(input.pdiId);
      if (!pdi) throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI nao encontrado' });
      
      if (ctx.user.role === 'lider') {
        const subordinates = await db.getSubordinates(Number(ctx.user.id));
        const subIds = subordinates.map((s: { id: number }) => s.id);
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
    create: protectedProcedure.input(z.object({ colaboradorId: z.number(), cicloId: z.number(), titulo: z.string(), objetivoGeral: z.string().optional(), relatorioAnalise: z.string().optional() })).mutation(async ({ input, ctx }) => {
      const pdiId = await db.createPDI({
        ...input,
        createdBy: Number(ctx.user.id),
      });
      return { success: true, pdiId };
    }),
    delete: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
      await db.deletePDI(input.id);
      return { success: true };
    }),
    update: adminProcedure.input(z.object({ 
      id: z.number(), 
      titulo: z.string().optional(), 
      objetivoGeral: z.string().optional(),
      relatorioAnalise: z.string().optional().nullable(),
      relatorioArquivoUrl: z.string().optional().nullable(),
      relatorioArquivoNome: z.string().optional().nullable(),
      relatorioArquivoKey: z.string().optional().nullable(),
      cicloId: z.number().optional(),
      status: z.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      await db.updatePDI(id, data);
      return { success: true };
    }),
    // Upload de arquivo do relatório de análise
    uploadRelatorioArquivo: adminProcedure
      .input(z.object({
        pdiId: z.number(),
        fileName: z.string(),
        fileType: z.string(),
        fileBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import("./storage");
        const buffer = Buffer.from(input.fileBase64, "base64");
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `pdi-relatorios/${input.pdiId}/${randomSuffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        
        await db.updatePDI(input.pdiId, {
          relatorioArquivoUrl: url,
          relatorioArquivoNome: input.fileName,
          relatorioArquivoKey: fileKey,
        });
        
        return { success: true, url, fileName: input.fileName };
      }),
    // Remover arquivo do relatório de análise
    removeRelatorioArquivo: adminProcedure
      .input(z.object({ pdiId: z.number() }))
      .mutation(async ({ input }) => {
        await db.updatePDI(input.pdiId, {
          relatorioArquivoUrl: null as any,
          relatorioArquivoNome: null as any,
          relatorioArquivoKey: null as any,
        });
        return { success: true };
      }),
  }),

  // ============= EVIDÊNCIAS (JÁ ATUALIZADO ANTERIORMENTE) =============
  // ============= IA - SUGESTÃO DE AÇÕES =============
  ia: router({
    sugerirAcao: adminProcedure
      .input(z.object({
        competenciaMacro: z.string(),
        competenciaMicro: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { competenciaMacro, competenciaMicro } = input;
        
        const prompt = `Você é um especialista em desenvolvimento de pessoas e PDI (Plano de Desenvolvimento Individual).

Baseado nas competências abaixo, sugira UMA ação de desenvolvimento específica e prática.

**Competência Macro (Geral):** ${competenciaMacro}
${competenciaMicro ? `**Competência Micro (Específica):** ${competenciaMicro}` : ''}

**Tipos de ações que você pode sugerir:**
- Cursos online ou presenciais (Coursera, Udemy, LinkedIn Learning, Alura, etc.)
- Workshops ou treinamentos
- Tarefas práticas no trabalho
- Palestras ou webinars
- Filmes ou documentários
- TEDTalks específicos (cite o nome do TED)
- Vídeos do YouTube (cite canais ou vídeos específicos)
- Livros ou artigos (cite títulos e autores)
- Podcasts (cite nomes específicos)
- Mentorias ou coaching
- Projetos práticos
- Job rotation
- Shadowing (acompanhamento)

**IMPORTANTE:** A resposta deve conter:
1. O QUE FAZER: Descrição clara e específica da ação
2. AVISO DE FLEXIBILIDADE: Informar que é uma sugestão e que pode fazer algo similar desde que desenvolva a competência
3. EVIDÊNCIA ESPERADA: O que o colaborador deve apresentar como prova de conclusão

**Responda EXATAMENTE no formato JSON abaixo:**
{
  "titulo": "Título curto e objetivo da ação (máximo 80 caracteres)",
  "detalhes": "Texto formatado com:\n\n📌 O QUE FAZER:\n[Descrição detalhada da ação com recursos específicos - nomes de cursos, livros, vídeos, etc. e duração estimada]\n\n💡 ESTA É UMA SUGESTÃO!\nVocê pode optar por uma ação similar (outro curso, workshop, livro, etc.) desde que desenvolva a competência de [nome da competência].\n\n📎 EVIDÊNCIA ESPERADA:\n[Descreva o que deve ser apresentado como prova: certificado, relatório, apresentação, etc.]",
  "tipo": "curso|workshop|tarefa_pratica|palestra|filme|tedtalk|video_youtube|livro|podcast|mentoria|projeto|job_rotation|shadowing"
}`;

        try {
          const response = await invokeLLM({
            messages: [
              { role: 'system', content: 'Você é um assistente especializado em desenvolvimento de competências profissionais. Sempre responda em JSON válido.' },
              { role: 'user', content: prompt }
            ],
            response_format: {
              type: 'json_schema',
              json_schema: {
                name: 'sugestao_acao',
                strict: true,
                schema: {
                  type: 'object',
                  properties: {
                    titulo: { type: 'string', description: 'Título curto da ação' },
                    detalhes: { type: 'string', description: 'Descrição detalhada da ação' },
                    tipo: { type: 'string', description: 'Tipo da ação sugerida' }
                  },
                  required: ['titulo', 'detalhes', 'tipo'],
                  additionalProperties: false
                }
              }
            }
          });
          
          const content = response.choices[0]?.message?.content;
          if (typeof content === 'string') {
            const sugestao = JSON.parse(content);
            return { success: true, sugestao };
          }
          
          throw new Error('Resposta inválida da IA');
        } catch (error) {
          console.error('[ia.sugerirAcao] Erro:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Erro ao gerar sugestão com IA' });
        }
      }),
  }),

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
    approve: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.id);
        if(ev) {
            await db.updateEvidenceStatus(input.id, { status: 'aprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
            
            // Verificar se a ação existe antes de atualizar
            const action = await db.getActionById(ev.actionId);
            if(action) {
                await db.updateAction(ev.actionId, { status: 'concluida' });
                await notifyOwner({
                    title: '✅ Evidência Aprovada',
                    content: `A evidência para a ação "${action.titulo}" foi aprovada pelo administrador.`
                });
            }
        }
        return { success: true };
    }),
    reject: adminProcedure.input(z.object({ id: z.number(), justificativa: z.string().optional() })).mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.id);
        if(ev) {
            await db.updateEvidenceStatus(input.id, { 
                status: 'reprovada', 
                evaluatedBy: ctx.user!.id, 
                evaluatedAt: new Date(),
                justificativaAdmin: input.justificativa || 'Evidência rejeitada pelo administrador'
            });
            
            // Verificar se a ação existe antes de atualizar
            const action = await db.getActionById(ev.actionId);
            if(action) {
                await db.updateAction(ev.actionId, { status: 'em_andamento' });
                await notifyOwner({
                    title: '❌ Evidência Reprovada',
                    content: `A evidência para a ação "${action.titulo}" foi reprovada. Motivo: ${input.justificativa || 'Não especificado'}`
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
          const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
          const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
          return { 
            ...ev, 
            files: filesRows || [], 
            texts: textsRows || [] 
          };
        })
      );
    }),
    listPending: adminProcedure.query(async () => {
      try {
        const rawEvidences = await db.getPendingEvidences();
        return await Promise.all(
          rawEvidences.map(async (ev: any) => {
            try {
              const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
              const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
              return { 
                ...ev, 
                files: filesRows || [], 
                texts: textsRows || [] 
              };
            } catch (error) {
              return { ...ev, files: [], texts: [] };
            }
          })
        );
      } catch (error) {
        throw error;
      }
    }),
    listByUser: protectedProcedure.query(async ({ ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) return [];
      
      try {
        // Buscar todas as ações do usuário
        const userActions = await db.getActionsByColaboradorId(userId);
        
        if (!userActions || userActions.length === 0) {
          console.log('[listByUser] Nenhuma ação encontrada para userId', userId);
          return [];
        }
        
        const actionIds = userActions.map((a: any) => a.id);
        
        // Buscar todas as evidências dessas ações
        const evidencesList = await db.getEvidencesByActionIds(actionIds);
        
        console.log('[listByUser] Evidencias encontradas para userId', userId, ':', evidencesList);
        return evidencesList || [];
      } catch (error) {
        console.error('[listByUser] Erro ao buscar evidências:', error);
        return [];
      }
    }),
    
    // ============= PROCEDURES PARA LÍDER =============
    
    // Listar evidências pendentes da equipe do líder
    getPendingByTeam: adminOrLeaderProcedure.query(async ({ ctx }) => {
      const leaderId = ctx.user?.id;
      if (!leaderId) return [];
      
      try {
        const rawEvidences = await db.getPendingEvidencesByLeader(leaderId);
        // Para cada evidência, buscamos os arquivos e textos vinculados
        return await Promise.all(
          rawEvidences.map(async (ev: any) => {
            const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
            const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
            return { 
              ...ev, 
              files: filesRows || [], 
              texts: textsRows || [] 
            };
          })
        );
      } catch (error) {
        console.error('[getPendingByTeam] Erro:', error);
        return [];
      }
    }),
    
    // Aprovar evidência (líder)
    aprovar: adminOrLeaderProcedure.input(z.object({ evidenceId: z.number() })).mutation(async ({ ctx, input }) => {
      const ev = await db.getEvidenceById(input.evidenceId);
      if (!ev) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
      }
      
      // Verificar se o líder tem permissão (se não for admin, verificar se é líder do colaborador)
      if (ctx.user?.role !== 'admin') {
        const colaborador = await db.getUserById(ev.colaboradorId);
        if (!colaborador || colaborador.leaderId !== ctx.user?.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para aprovar esta evidência' });
        }
      }
      
      await db.updateEvidenceStatus(input.evidenceId, { 
        status: 'aprovada', 
        evaluatedBy: ctx.user!.id, 
        evaluatedAt: new Date() 
      });
      
      // Verificar se a ação existe antes de atualizar
      const action = await db.getActionById(ev.actionId);
      if (action) {
        await db.updateAction(ev.actionId, { status: 'concluida' });
        await notifyOwner({
          title: '✅ Evidência Aprovada pelo Líder',
          content: `A evidência para a ação "${action.titulo}" foi aprovada.`
        });
      }
      
      return { success: true };
    }),
    
    // Reprovar evidência (líder)
    reprovar: adminOrLeaderProcedure.input(z.object({ 
      evidenceId: z.number(),
      justificativa: z.string().min(10, 'Justificativa deve ter pelo menos 10 caracteres')
    })).mutation(async ({ ctx, input }) => {
      const ev = await db.getEvidenceById(input.evidenceId);
      if (!ev) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
      }
      
      // Verificar se o líder tem permissão (se não for admin, verificar se é líder do colaborador)
      if (ctx.user?.role !== 'admin') {
        const colaborador = await db.getUserById(ev.colaboradorId);
        if (!colaborador || colaborador.leaderId !== ctx.user?.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para reprovar esta evidência' });
        }
      }
      
      await db.updateEvidenceStatus(input.evidenceId, { 
        status: 'reprovada', 
        evaluatedBy: ctx.user!.id, 
        evaluatedAt: new Date(),
        justificativaAdmin: input.justificativa
      });
      
      // Verificar se a ação existe antes de atualizar
      const action = await db.getActionById(ev.actionId);
      if (action) {
        await db.updateAction(ev.actionId, { status: 'em_andamento' });
        await notifyOwner({
          title: '❌ Evidência Reprovada',
          content: `A evidência para a ação "${action.titulo}" foi reprovada. Justificativa: ${input.justificativa}`
        });
      }
      
      return { success: true };
    }),
    
    // Contestar rejeição de evidência (colaborador)
    contestar: protectedProcedure.input(z.object({
      evidenceId: z.number(),
      resposta: z.string().min(10, 'A contestação deve ter pelo menos 10 caracteres')
    })).mutation(async ({ ctx, input }) => {
      const ev = await db.getEvidenceById(input.evidenceId);
      if (!ev) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
      }
      
      // Verificar se a evidência pertence ao usuário
      if (ev.colaboradorId !== ctx.user?.id) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para contestar esta evidência' });
      }
      
      // Verificar se a evidência foi reprovada
      if (ev.status !== 'reprovada') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Apenas evidências reprovadas podem ser contestadas' });
      }
      
      // Atualizar a evidência com a contestação
      await db.execute(sql`
        UPDATE evidences 
        SET respostaColaborador = ${input.resposta}, 
            dataResposta = ${new Date()}
        WHERE id = ${input.evidenceId}
      `);
      
      // Notificar o líder/admin sobre a contestação
      const action = await db.getActionById(ev.actionId);
      const colaborador = await db.getUserById(ev.colaboradorId);
      if (action && colaborador) {
        await notifyOwner({
          title: '⚠️ Contestação de Evidência',
          content: `${colaborador.name} contestou a rejeição da evidência para a ação "${action.titulo}". Contestação: ${input.resposta}`
        });
      }
      
      return { success: true };
    }),
  }),

  // ROUTER DE BACKUP
  backup: router({
    list: adminProcedure.query(async () => {
      return await db.getAllBackups();
    }),
    
    generate: adminProcedure.mutation(async ({ ctx }) => {
      const { storagePut } = await import('./storage');
      
      // Gerar nome do arquivo com timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-pdi-${timestamp}.sql`;
      const fileKey = `backups/${filename}`;
      
      try {
        // Gerar dados do backup
        const { sqlContent, totalRecords } = await db.generateBackupData();
        
        // Upload para S3
        const { url } = await storagePut(fileKey, sqlContent, 'application/sql');
        
        // Salvar registro do backup
        const result = await db.createBackup({
          filename,
          fileUrl: url,
          fileKey,
          fileSize: Buffer.byteLength(sqlContent, 'utf8'),
          totalRecords,
          status: 'concluido',
          createdBy: ctx.user!.id
        });
        
        return { 
          success: true, 
          backupId: result.insertId,
          filename,
          totalRecords,
          fileSize: Buffer.byteLength(sqlContent, 'utf8'),
          downloadUrl: url
        };
      } catch (error: any) {
        // Apenas lançar o erro sem tentar registrar (evita loop de erros)
        console.error('Erro ao gerar backup:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Erro ao gerar backup: ${error.message}`
        });
      }
    }),
    
    markDownloaded: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markBackupDownloaded(input.id);
        return { success: true };
      }),

    restore: adminProcedure
      .input(z.object({ sqlContent: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const result = await db.restoreBackupFromSQL(input.sqlContent);
          
          if (result.success) {
            return {
              success: true,
              message: `Backup restaurado com sucesso! ${result.executedStatements} registros restaurados.`,
              executedStatements: result.executedStatements
            };
          } else {
            return {
              success: false,
              message: `Restauração concluída com ${result.errors.length} erros. ${result.executedStatements} registros restaurados.`,
              executedStatements: result.executedStatements,
              errors: result.errors
            };
          }
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao restaurar backup: ${error.message}`
          });
        }
      }),

    exportReport: adminProcedure
      .input(z.object({ type: z.string() }))
      .mutation(async ({ input }) => {
        const timestamp = new Date().toISOString().slice(0, 10);

        try {
          // Relatório geral único com todos os dados
          const dados = await db.getRelatorioGeral();
          
          // Cabeçalho do CSV
          let content = 'Usuario_ID,Usuario_Nome,Usuario_Email,Usuario_CPF,Usuario_Cargo,Usuario_Perfil,Usuario_Status,Departamento,Lider,PDI_ID,PDI_Titulo,PDI_Status,Ciclo,Acao_ID,Acao_Titulo,Acao_Status,Acao_Prazo,Competencia_Macro\n';
          
          // Dados
          content += dados.map((row: any) => 
            `${row.usuario_id || ''},"${row.usuario_nome || ''}","${row.usuario_email || ''}","${row.usuario_cpf || ''}","${row.usuario_cargo || ''}","${row.usuario_perfil || ''}","${row.usuario_status || ''}","${row.departamento_nome || ''}","${row.lider_nome || ''}",${row.pdi_id || ''},"${row.pdi_titulo || ''}","${row.pdi_status || ''}","${row.ciclo_nome || ''}",${row.acao_id || ''},"${row.acao_titulo || ''}","${row.acao_status || ''}","${row.acao_prazo || ''}","${row.competencia_macro || ''}"`
          ).join('\n');
          
          const filename = `relatorio-geral-${timestamp}.csv`;

          return { content, filename };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao exportar relatório: ${error.message}`
          });
        }
      }),
  }),

  // Router de Importação em Massa
  import: router({
    users: adminProcedure
      .input(z.object({
        users: z.array(z.object({
          name: z.string(),
          email: z.string().email(),
          cpf: z.string(),
          cargo: z.string().optional(),
          departamentoNome: z.string().optional(),
          leaderEmail: z.string().optional(),
          role: z.enum(['admin', 'gerente', 'lider', 'colaborador'])
        }))
      }))
      .mutation(async ({ input }) => {
        try {
          const results = await db.importUsers(input.users);
          const successCount = results.filter(r => r.success).length;
          const errorCount = results.filter(r => !r.success).length;
          
          return {
            success: errorCount === 0,
            message: `${successCount} usuários importados com sucesso. ${errorCount} erros.`,
            results
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao importar usuários: ${error.message}`
          });
        }
      }),

    // Validar ações antes de importar (não insere no banco)
    validarAcoes: adminProcedure
      .input(z.object({
        acoes: z.array(z.object({
          linha: z.number(),
          cpf: z.string().optional(),
          cicloNome: z.string().optional(),
          macroNome: z.string().optional(),
          microcompetencia: z.string().optional(),
          titulo: z.string(),
          descricao: z.string().optional(),
          prazo: z.string().optional()
        }))
      }))
      .mutation(async ({ input }) => {
        try {
          const results = await db.validarAcoes(input.acoes);
          const validCount = results.filter(r => r.valido).length;
          const errorCount = results.filter(r => !r.valido).length;
          
          return {
            success: errorCount === 0,
            message: `${validCount} ações válidas. ${errorCount} com erros.`,
            results
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao validar ações: ${error.message}`
          });
        }
      }),

    acoes: adminProcedure
      .input(z.object({
        acoes: z.array(z.object({
          cpf: z.string(),
          cicloNome: z.string(),
          macroNome: z.string(),
          microcompetencia: z.string().optional(),
          titulo: z.string(),
          descricao: z.string().optional(),
          prazo: z.string()
        }))
      }))
      .mutation(async ({ input }) => {
        try {
          const results = await db.importAcoes(input.acoes);
          const successCount = results.filter(r => r.success).length;
          const errorCount = results.filter(r => !r.success).length;
          
          return {
            success: errorCount === 0,
            message: `${successCount} ações importadas com sucesso. ${errorCount} erros.`,
            results
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao importar ações: ${error.message}`
          });
        }
      }),

    pdis: adminProcedure
      .input(z.object({
        pdis: z.array(z.object({
          userEmail: z.string().email(),
          cicloNome: z.string(),
          status: z.string().optional(),
          observacoes: z.string().optional()
        }))
      }))
      .mutation(async ({ input }) => {
        try {
          const results = await db.importPdis(input.pdis);
          const successCount = results.filter(r => r.success).length;
          const errorCount = results.filter(r => !r.success).length;
          
          return {
            success: errorCount === 0,
            message: `${successCount} PDIs importados com sucesso. ${errorCount} erros.`,
            results
          };
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao importar PDIs: ${error.message}`
          });
        }
      }),
  }),

  // Router de Auditoria de Exclusões
  // Router de Estatísticas de Prazo
  prazos: router({
    estatisticas: protectedProcedure
      .input(z.object({
        departamentoId: z.number().nullable().optional(),
        leaderId: z.number().optional(),
        colaboradorId: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          // Se for colaborador, só pode ver suas próprias estatísticas
          if (ctx.user.role === 'colaborador') {
            return await db.getEstatisticasPrazo({ colaboradorId: ctx.user.id });
          }
          // Se for líder, pode ver da sua equipe
          if (ctx.user.role === 'lider') {
            return await db.getEstatisticasPrazo({ leaderId: ctx.user.id, ...input });
          }
          // Admin e Gerente podem ver tudo
          if (ctx.user.role === 'admin' || ctx.user.role === 'gerente') {
            return await db.getEstatisticasPrazo(input);
          }
          // Fallback para outros roles
          return await db.getEstatisticasPrazo({ colaboradorId: ctx.user.id });
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao buscar estatísticas de prazo: ${error.message}`
          });
        }
      }),

    vencidas: protectedProcedure
      .input(z.object({
        departamentoId: z.number().nullable().optional(),
        leaderId: z.number().optional(),
        colaboradorId: z.number().optional(),
        limite: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          // Se for colaborador, só pode ver suas próprias ações
          if (ctx.user.role === 'colaborador') {
            return await db.getAcoesVencidas({ colaboradorId: ctx.user.id, limite: input?.limite });
          }
          // Se for líder, pode ver da sua equipe
          if (ctx.user.role === 'lider') {
            return await db.getAcoesVencidas({ leaderId: ctx.user.id, ...input });
          }
          // Admin e Gerente podem ver tudo
          if (ctx.user.role === 'admin' || ctx.user.role === 'gerente') {
            return await db.getAcoesVencidas(input);
          }
          // Fallback para outros roles
          return await db.getAcoesVencidas({ colaboradorId: ctx.user.id, limite: input?.limite });
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao buscar ações vencidas: ${error.message}`
          });
        }
      }),

    proximasVencer: protectedProcedure
      .input(z.object({
        departamentoId: z.number().nullable().optional(),
        leaderId: z.number().optional(),
        colaboradorId: z.number().optional(),
        diasAntecedencia: z.number().optional(),
        limite: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        try {
          // Se for colaborador, só pode ver suas próprias ações
          if (ctx.user.role === 'colaborador') {
            return await db.getAcoesProximasVencer({ colaboradorId: ctx.user.id, ...input });
          }
          // Se for líder, pode ver da sua equipe
          if (ctx.user.role === 'lider') {
            return await db.getAcoesProximasVencer({ leaderId: ctx.user.id, ...input });
          }
          // Admin pode ver tudo
          return await db.getAcoesProximasVencer(input);
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao buscar ações próximas do vencimento: ${error.message}`
          });
        }
      }),

    // Rota específica para o colaborador ver suas ações vencidas
    minhasVencidas: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          return await db.getAcoesVencidas({ colaboradorId: ctx.user.id });
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao buscar suas ações vencidas: ${error.message}`
          });
        }
      }),

    // Relatório completo de ações vencidas (admin e gerente)
    relatorio: adminOrGerenteProcedure
      .input(z.object({
        departamentoId: z.number().nullable().optional(),
        colaboradorId: z.number().optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          return await db.getRelatorioAcoesVencidas(input);
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao gerar relatório de ações vencidas: ${error.message}`
          });
        }
      }),
  }),

  auditoria: router({
    listar: adminProcedure
      .input(z.object({
        entidadeTipo: z.enum(['acao', 'pdi', 'usuario', 'evidencia', 'solicitacao']).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        excluidoPor: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          return await db.getAuditoriasExclusao(input);
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao buscar auditoria: ${error.message}`
          });
        }
      }),

    estatisticas: adminProcedure
      .query(async () => {
        try {
          return await db.getEstatisticasAuditoria();
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao buscar estatísticas: ${error.message}`
          });
        }
      }),
  })
});

export type AppRouter = typeof appRouter;
