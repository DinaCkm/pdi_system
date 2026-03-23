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
import { sendEmailParecerCKMParaLider, sendEmailParecerLiderParaGerente, sendEmailAcaoAprovadaParaColaborador, sendEmailAcaoReprovadaParaColaborador, sendEmailRevisaoSolicitadaParaCKM, sendEmailRevisaoLiderParaCKM, sendEmailSolicitacaoVetada, sendEmailAcaoAprovadaParaLider, sendEmailRelatorioIncluidoNoPDI, sendEmailParabensEvidenciaAprovada, sendEmailEvidenciaReprovada, sendEmailAcoesVencidasEmpregado, sendEmailAcoesVencidasLider, sendEmailResumoVarreduraAdmin, sendEmailEvidenciaEnviadaParaLider } from "./_core/email";

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
    update: adminProcedure.input(z.object({ id: z.number(), leaderId: z.number().nullable().optional(), role: z.enum(["admin", "gerente", "lider", "colaborador"]).optional(), name: z.string().optional(), email: z.string().optional(), cpf: z.string().optional(), cargo: z.string().optional(), departamentoId: z.number().nullable().optional(), status: z.string().optional() })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      // Limpar CPF se fornecido (remover formatação)
      if (data.cpf) {
        data.cpf = data.cpf.replace(/\D/g, "");
      }
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
    getTop3CompetenciasComGaps: adminOrGerenteProcedure.query(async () => await db.getTop3CompetenciasComGaps()),
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
      
      // Verificar se está incluindo relatório (texto) pela primeira vez
      if (data.relatorioAnalise && data.relatorioAnalise.trim().length > 0) {
        const pdiAntes = await db.getPDIById(id);
        const tinhaRelatorioAntes = pdiAntes?.relatorioAnalise && (pdiAntes.relatorioAnalise as string).trim().length > 0;
        
        await db.updatePDI(id, data);
        
        // Enviar e-mail se é a primeira vez que o relatório é incluído
        if (!tinhaRelatorioAntes && pdiAntes) {
          const pdiAtualizado = await db.getPDIById(id);
          if (pdiAtualizado) {
            const colaborador = await db.getUserById(pdiAtualizado.colaboradorId);
            const lider = colaborador?.leaderId ? await db.getUserById(colaborador.leaderId) : null;
            if (colaborador?.email) {
              sendEmailRelatorioIncluidoNoPDI({
                colaboradorEmail: colaborador.email,
                colaboradorName: colaborador.name || 'Colaborador',
                liderEmail: lider?.email || undefined,
                liderName: lider?.name || undefined,
                tituloPdi: pdiAtualizado.titulo || 'PDI',
              }).catch(err => console.warn('[Email] Erro ao enviar email de relatório:', err));
            }
          }
        }
      } else {
        await db.updatePDI(id, data);
      }
      
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
        // Novos campos do formulário guiado
        tipoEvidencia: z.enum(['certificado','relatorio','projeto','apresentacao','evento','mentoria','outro']).optional(),
        dataRealizacao: z.string().optional(), // formato YYYY-MM-DD
        cargaHoraria: z.number().optional(),
        oQueRealizou: z.string().optional(),
        comoAplicou: z.string().optional(),
        resultadoPratico: z.string().optional(),
        impactoPercentual: z.number().min(0).max(100).optional(),
        principalAprendizado: z.string().optional(),
        linkExterno: z.string().optional(),
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
          // Montar descrição consolidada (compatibilidade com sistema antigo)
          let descricaoConsolidada = input.descricao || '';
          if (input.oQueRealizou) {
            descricaoConsolidada = input.oQueRealizou;
            if (input.comoAplicou) descricaoConsolidada += `\n\n--- Como Apliquei ---\n${input.comoAplicou}`;
            if (input.resultadoPratico) descricaoConsolidada += `\n\n--- Resultado Prático ---\n${input.resultadoPratico}`;
            if (input.principalAprendizado) descricaoConsolidada += `\n\n--- Principal Aprendizado ---\n${input.principalAprendizado}`;
          }

          // 1. Criar a evidência principal com todos os novos campos
          const evidenceId = await db.createEvidence({ 
            actionId: input.actionId, 
            colaboradorId: Number(ctx.user!.id), 
            descricao: descricaoConsolidada || null,
            status: 'aguardando_avaliacao',
            tipoEvidencia: input.tipoEvidencia || null,
            dataRealizacao: input.dataRealizacao || null,
            cargaHoraria: input.cargaHoraria || null,
            oQueRealizou: input.oQueRealizou || null,
            comoAplicou: input.comoAplicou || null,
            resultadoPratico: input.resultadoPratico || null,
            impactoPercentual: input.impactoPercentual ?? null,
            principalAprendizado: input.principalAprendizado || null,
            linkExterno: input.linkExterno || null,
          });
          console.log('[evidences.create] ✅ Evidence criada com ID:', evidenceId);
          
          // 2. Salvar os arquivos com todos os metadados
          if (input.files && input.files.length > 0) {
            console.log('[evidences.create] Salvando', input.files.length, 'arquivos...');
            for (const file of input.files) {
              if (!file.fileUrl) {
                throw new Error('Arquivo sem URL');
              }
              await db.createEvidenceFile(evidenceId, file);
            }
          }
          
          // 3. Salvar o texto na tabela vinculada (compatibilidade)
          if (descricaoConsolidada) {
            await db.createEvidenceText(evidenceId, descricaoConsolidada);
          }
          
          // 4. Atualizar status da ação
          await db.updateAction(input.actionId, { status: 'aguardando_avaliacao' });
          
          // 5. Enviar e-mail ao líder SOMENTE se o empregado preencheu aplicabilidade prática (impactoPercentual)
          if (input.impactoPercentual != null && input.impactoPercentual > 0) {
            try {
              // Buscar dados da ação e do PDI para o e-mail
              const action = await db.getActionById(input.actionId);
              if (action) {
                const pdi = await db.getPDIById(action.pdiId);
                const colaborador = await db.getUserById(Number(ctx.user!.id));
                if (pdi && colaborador && colaborador.leaderId) {
                  const lider = await db.getUserById(colaborador.leaderId);
                  if (lider && lider.email) {
                    await sendEmailEvidenciaEnviadaParaLider({
                      liderEmail: lider.email,
                      liderName: lider.name || 'Líder',
                      colaboradorName: colaborador.name || 'Colaborador',
                      tituloAcao: action.titulo || 'Ação',
                      tituloPdi: pdi.titulo || pdi.objetivoGeral || 'PDI',
                      oQueRealizou: input.oQueRealizou || undefined,
                      comoAplicou: input.comoAplicou || undefined,
                      resultadoPratico: input.resultadoPratico || undefined,
                      impactoPercentual: input.impactoPercentual,
                      principalAprendizado: input.principalAprendizado || undefined,
                    });
                    console.log('[evidences.create] ✅ E-mail de aplicabilidade prática enviado ao líder:', lider.email);
                  }
                }
              }
            } catch (emailError) {
              // Não falhar a criação da evidência por causa do e-mail
              console.error('[evidences.create] ⚠️ Erro ao enviar e-mail ao líder (não crítico):', emailError);
            }
          }
          
          console.log('[evidences.create] ✅ SUCESSO COMPLETO - Evidence ID:', evidenceId);
          return { success: true, evidenceId };
        } catch (error) {
          console.error('[evidences.create] ❌ ERRO CAPTURADO:', error);
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

                // Enviar e-mail de parabéns ao colaborador e cópia ao líder
                try {
                  const colaborador = await db.getUserById(ev.colaboradorId);
                  if (colaborador && colaborador.email) {
                    // Buscar o PDI da ação para incluir o título
                    const [pdiRows]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${ev.actionId} LIMIT 1`);
                    const tituloPdi = pdiRows?.[0]?.titulo || 'PDI';

                    // Buscar líder do colaborador
                    let liderEmail: string | undefined;
                    let liderName: string | undefined;
                    if (colaborador.leaderId) {
                      const lider = await db.getUserById(colaborador.leaderId);
                      if (lider && lider.email) {
                        liderEmail = lider.email;
                        liderName = lider.name || 'Líder';
                      }
                    }

                    await sendEmailParabensEvidenciaAprovada({
                      colaboradorEmail: colaborador.email,
                      colaboradorName: colaborador.name || 'Colaborador(a)',
                      tituloAcao: action.titulo,
                      tituloPdi,
                      liderEmail,
                      liderName,
                    });
                  }
                } catch (emailErr) {
                  console.warn('[evidences.approve] Erro ao enviar e-mail de parabéns:', emailErr);
                }
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

                // Enviar e-mail ao colaborador e líder sobre a reprovação
                try {
                  const colaborador = await db.getUserById(ev.colaboradorId);
                  if (colaborador && colaborador.email) {
                    const [pdiRows]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${ev.actionId} LIMIT 1`);
                    const tituloPdi = pdiRows?.[0]?.titulo || 'PDI';

                    let liderEmail: string | undefined;
                    let liderName: string | undefined;
                    if (colaborador.leaderId) {
                      const lider = await db.getUserById(colaborador.leaderId);
                      if (lider && lider.email) {
                        liderEmail = lider.email;
                        liderName = lider.name || 'Líder';
                      }
                    }

                    await sendEmailEvidenciaReprovada({
                      colaboradorEmail: colaborador.email,
                      colaboradorName: colaborador.name || 'Colaborador(a)',
                      tituloAcao: action.titulo,
                      tituloPdi,
                      justificativa: input.justificativa || 'Evidência rejeitada pelo administrador',
                      avaliadorName: ctx.user?.name || 'Administrador',
                      liderEmail,
                      liderName,
                    });
                  }
                } catch (emailErr) {
                  console.warn('[evidences.reject] Erro ao enviar e-mail de reprovação:', emailErr);
                }
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
    listEvaluated: adminProcedure.query(async () => {
      try {
        const rawEvidences = await db.getEvaluatedEvidences();
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
    listApproved: adminProcedure.query(async () => {
      try {
        const rawEvidences = await db.getEvidencesByStatus('aprovada');
        return await Promise.all(
          rawEvidences.map(async (ev: any) => {
            try {
              const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
              const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
              return { ...ev, files: filesRows || [], texts: textsRows || [] };
            } catch (error) {
              return { ...ev, files: [], texts: [] };
            }
          })
        );
      } catch (error) {
        throw error;
      }
    }),
    listRejected: adminProcedure.query(async () => {
      try {
        const rawEvidences = await db.getEvidencesByStatus('reprovada');
        return await Promise.all(
          rawEvidences.map(async (ev: any) => {
            try {
              const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
              const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
              return { ...ev, files: filesRows || [], texts: textsRows || [] };
            } catch (error) {
              return { ...ev, files: [], texts: [] };
            }
          })
        );
      } catch (error) {
        throw error;
      }
    }),
    listAll: protectedProcedure.query(async () => {
      try {
        const rawEvidences = await db.getAllEvidences();
        return await Promise.all(
          rawEvidences.map(async (ev: any) => {
            try {
              const [filesRows]: any = await db.execute(sql`SELECT * FROM evidence_files WHERE evidenceId = ${ev.id}`);
              const [textsRows]: any = await db.execute(sql`SELECT * FROM evidence_texts WHERE evidenceId = ${ev.id}`);
              return { ...ev, files: filesRows || [], texts: textsRows || [] };
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

        // Enviar e-mail de parabéns ao colaborador
        try {
          const colaboradorAprov = await db.getUserById(ev.colaboradorId);
          if (colaboradorAprov && colaboradorAprov.email) {
            const [pdiRowsAprov]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${ev.actionId} LIMIT 1`);
            const tituloPdiAprov = pdiRowsAprov?.[0]?.titulo || 'PDI';

            let liderEmailAprov: string | undefined;
            let liderNameAprov: string | undefined;
            if (colaboradorAprov.leaderId) {
              const liderAprov = await db.getUserById(colaboradorAprov.leaderId);
              if (liderAprov && liderAprov.email) {
                liderEmailAprov = liderAprov.email;
                liderNameAprov = liderAprov.name || 'Líder';
              }
            }

            await sendEmailParabensEvidenciaAprovada({
              colaboradorEmail: colaboradorAprov.email,
              colaboradorName: colaboradorAprov.name || 'Colaborador(a)',
              tituloAcao: action.titulo,
              tituloPdi: tituloPdiAprov,
              liderEmail: liderEmailAprov,
              liderName: liderNameAprov,
            });
          }
        } catch (emailErr) {
          console.warn('[evidences.aprovar-lider] Erro ao enviar e-mail de parabéns:', emailErr);
        }
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

        // Enviar e-mail ao colaborador e líder sobre a reprovação
        try {
          const colaboradorRepr = await db.getUserById(ev.colaboradorId);
          if (colaboradorRepr && colaboradorRepr.email) {
            const [pdiRowsRepr]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${ev.actionId} LIMIT 1`);
            const tituloPdiRepr = pdiRowsRepr?.[0]?.titulo || 'PDI';

            let liderEmailRepr: string | undefined;
            let liderNameRepr: string | undefined;
            if (colaboradorRepr.leaderId) {
              const liderRepr = await db.getUserById(colaboradorRepr.leaderId);
              if (liderRepr && liderRepr.email) {
                liderEmailRepr = liderRepr.email;
                liderNameRepr = liderRepr.name || 'Líder';
              }
            }

            await sendEmailEvidenciaReprovada({
              colaboradorEmail: colaboradorRepr.email,
              colaboradorName: colaboradorRepr.name || 'Colaborador(a)',
              tituloAcao: action.titulo,
              tituloPdi: tituloPdiRepr,
              justificativa: input.justificativa,
              avaliadorName: ctx.user?.name || 'Avaliador',
              liderEmail: liderEmailRepr,
              liderName: liderNameRepr,
            });
          }
        } catch (emailErr) {
          console.warn('[evidences.reprovar-lider] Erro ao enviar e-mail de reprovação:', emailErr);
        }
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

    // Validar impacto da evidência (admin) - Avaliação em 2 etapas
    validateImpact: adminProcedure
      .input(z.object({
        evidenceId: z.number(),
        evidenciaComprova: z.enum(['sim', 'nao', 'insuficiente']),
        impactoComprova: z.enum(['sim', 'nao', 'parcialmente']).optional(),
        impactoValidadoAdmin: z.number().min(0).max(100).optional(),
        parecerImpacto: z.string().optional(),
        justificativaAdmin: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const ev = await db.getEvidenceById(input.evidenceId);
        if (!ev) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
        }

        if (input.evidenciaComprova === 'nao' || input.evidenciaComprova === 'insuficiente') {
          const statusMsg = input.evidenciaComprova === 'insuficiente' 
            ? 'Não foi possível avaliar a aplicabilidade prática com base nos relatos'
            : 'Evidência não comprova a realização da ação';
          await db.updateEvidenceStatus(input.evidenceId, {
            status: 'reprovada',
            evaluatedBy: ctx.user!.id,
            evaluatedAt: new Date(),
            justificativaAdmin: input.justificativaAdmin || statusMsg,
          });
          await db.execute(sql`
            UPDATE evidences 
            SET evidenciaComprova = ${input.evidenciaComprova},
                impactoComprova = NULL,
                impactoValidadoAdmin = NULL,
                parecerImpacto = ${input.parecerImpacto || null}
            WHERE id = ${input.evidenceId}
          `);
          const action = await db.getActionById(ev.actionId);
          if (action) await db.updateAction(ev.actionId, { status: 'em_andamento' });

          try {
            const colaborador = await db.getUserById(ev.colaboradorId);
            if (colaborador?.email) {
              const [pdiRows]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${ev.actionId} LIMIT 1`);
              let liderEmail: string | undefined, liderName: string | undefined;
              if (colaborador.leaderId) { const lider = await db.getUserById(colaborador.leaderId); if (lider?.email) { liderEmail = lider.email; liderName = lider.name || 'Líder'; } }
              await sendEmailEvidenciaReprovada({ colaboradorEmail: colaborador.email, colaboradorName: colaborador.name || 'Colaborador(a)', tituloAcao: action?.titulo || 'Ação', tituloPdi: pdiRows?.[0]?.titulo || 'PDI', justificativa: input.justificativaAdmin || 'Evidência não comprova', avaliadorName: ctx.user?.name || 'Admin', liderEmail, liderName });
            }
          } catch (e) { console.warn('[validateImpact] Erro email:', e); }
          return { success: true, status: 'reprovada' as const };
        }

        // Aprovar + validar impacto
        await db.updateEvidenceStatus(input.evidenceId, { status: 'aprovada', evaluatedBy: ctx.user!.id, evaluatedAt: new Date() });
        await db.execute(sql`
          UPDATE evidences 
          SET evidenciaComprova = 'sim',
              impactoComprova = ${input.impactoComprova || null},
              impactoValidadoAdmin = ${input.impactoValidadoAdmin ?? null},
              parecerImpacto = ${input.parecerImpacto || null}
          WHERE id = ${input.evidenceId}
        `);
        const action = await db.getActionById(ev.actionId);
        if (action) await db.updateAction(ev.actionId, { status: 'concluida' });

        try {
          const colaborador = await db.getUserById(ev.colaboradorId);
          if (colaborador?.email) {
            const [pdiRows]: any = await db.execute(sql`SELECT p.titulo FROM pdis p JOIN actions a ON a.pdiId = p.id WHERE a.id = ${ev.actionId} LIMIT 1`);
            let liderEmail: string | undefined, liderName: string | undefined;
            if (colaborador.leaderId) { const lider = await db.getUserById(colaborador.leaderId); if (lider?.email) { liderEmail = lider.email; liderName = lider.name || 'Líder'; } }
            await sendEmailParabensEvidenciaAprovada({ colaboradorEmail: colaborador.email, colaboradorName: colaborador.name || 'Colaborador(a)', tituloAcao: action?.titulo || 'Ação', tituloPdi: pdiRows?.[0]?.titulo || 'PDI', liderEmail, liderName });
          }
        } catch (e) { console.warn('[validateImpact] Erro email:', e); }
        return { success: true, status: 'aprovada' as const, impactoValidado: input.impactoValidadoAdmin };
      }),

    // Upload de arquivo para evidência (S3)
    uploadFile: protectedProcedure
      .input(z.object({ fileName: z.string(), fileType: z.string(), fileBase64: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { storagePut } = await import('./storage');
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileKey = `evidences/${ctx.user!.id}/${randomSuffix}-${safeFileName}`;
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        return { fileName: input.fileName, fileType: input.fileType, fileSize: buffer.length, fileUrl: url, fileKey };
      }),

    // Calcular IIP (Indice de Impacto Prático)
    getIIP: protectedProcedure
      .input(z.object({ colaboradorId: z.number().optional(), departamentoId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        let whereClause = `WHERE e.status = 'aprovada' AND e.impactoValidadoAdmin IS NOT NULL`;
        if (input.colaboradorId) whereClause += ` AND e.colaboradorId = ${input.colaboradorId}`;
        if (input.departamentoId) whereClause += ` AND u.departamentoId = ${input.departamentoId}`;
        if (ctx.user?.role === 'lider' && !input.colaboradorId) whereClause += ` AND u.leaderId = ${ctx.user.id}`;
        if (ctx.user?.role === 'colaborador') whereClause += ` AND e.colaboradorId = ${ctx.user.id}`;

        // IIP = média entre impacto declarado pelo empregado e impacto validado pelo admin
        // Se o empregado não declarou impacto (impactoPercentual IS NULL), usa apenas o do admin
        const [rows]: any = await db.execute(sql.raw(`
          SELECT 
            AVG(
              CASE 
                WHEN e.impactoPercentual IS NOT NULL AND e.impactoPercentual > 0 
                THEN (e.impactoPercentual + e.impactoValidadoAdmin) / 2.0
                ELSE e.impactoValidadoAdmin
              END
            ) as iipGeral,
            AVG(e.impactoPercentual) as mediaEmpregado,
            AVG(e.impactoValidadoAdmin) as mediaAdmin,
            COUNT(e.id) as totalEvidencias, 
            COUNT(DISTINCT e.colaboradorId) as totalColaboradores
          FROM evidences e JOIN users u ON u.id = e.colaboradorId ${whereClause}
        `));
        const iipGeral = rows?.[0]?.iipGeral ? Number(rows[0].iipGeral) : 0;
        const mediaEmpregado = rows?.[0]?.mediaEmpregado ? Number(rows[0].mediaEmpregado) : null;
        const mediaAdmin = rows?.[0]?.mediaAdmin ? Number(rows[0].mediaAdmin) : 0;

        const [porColaborador]: any = await db.execute(sql.raw(`
          SELECT e.colaboradorId, u.name as colaboradorNome, 
            AVG(
              CASE 
                WHEN e.impactoPercentual IS NOT NULL AND e.impactoPercentual > 0 
                THEN (e.impactoPercentual + e.impactoValidadoAdmin) / 2.0
                ELSE e.impactoValidadoAdmin
              END
            ) as iip,
            AVG(e.impactoPercentual) as mediaEmpregado,
            AVG(e.impactoValidadoAdmin) as mediaAdmin,
            COUNT(e.id) as totalEvidencias
          FROM evidences e JOIN users u ON u.id = e.colaboradorId ${whereClause}
          GROUP BY e.colaboradorId, u.name ORDER BY iip DESC
        `));

        return {
          iipGeral: Math.round(iipGeral * 100) / 100,
          mediaEmpregado: mediaEmpregado != null ? Math.round(mediaEmpregado * 100) / 100 : null,
          mediaAdmin: Math.round(mediaAdmin * 100) / 100,
          totalEvidencias: rows?.[0]?.totalEvidencias || 0,
          totalColaboradores: rows?.[0]?.totalColaboradores || 0,
          porColaborador: (porColaborador || []).map((r: any) => ({
            colaboradorId: r.colaboradorId, 
            colaboradorNome: r.colaboradorNome, 
            iip: Math.round(Number(r.iip) * 100) / 100, 
            mediaEmpregado: r.mediaEmpregado != null ? Math.round(Number(r.mediaEmpregado) * 100) / 100 : null,
            mediaAdmin: Math.round(Number(r.mediaAdmin) * 100) / 100,
            totalEvidencias: r.totalEvidencias 
          })),
        };
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
      const filename = `backup-pdi-${timestamp}.csv`;
      const fileKey = `backups/${filename}`;
      
      try {
        // Gerar dados do backup em formato CSV
        const { csvBuffer, totalRecords } = await db.generateBackupData();
        
        // Upload para S3
        const { url } = await storagePut(fileKey, csvBuffer, 'text/csv; charset=utf-8');
        
        // Salvar registro do backup
        const result = await db.createBackup({
          filename,
          fileUrl: url,
          fileKey,
          fileSize: csvBuffer.length,
          totalRecords,
          status: 'concluido',
          createdBy: ctx.user!.id
        });
        
        return { 
          success: true, 
          backupId: result.insertId,
          filename,
          totalRecords,
          fileSize: csvBuffer.length,
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
          let content = 'Usuario_ID,Usuario_Nome,Usuario_Email,Usuario_CPF,Usuario_Cargo,Usuario_Perfil,Usuario_Status,Departamento,Lider,PDI_ID,PDI_Titulo,PDI_Status,Ciclo,Acao_ID,Acao_Titulo,Acao_Descricao,Acao_Status,Acao_Prazo,Competencia_Macro\n';
          
          // Dados
          content += dados.map((row: any) => 
            `${row.usuario_id || ''},"${row.usuario_nome || ''}","${row.usuario_email || ''}","${row.usuario_cpf || ''}","${row.usuario_cargo || ''}","${row.usuario_perfil || ''}","${row.usuario_status || ''}","${row.departamento_nome || ''}","${row.lider_nome || ''}",${row.pdi_id || ''},"${row.pdi_titulo || ''}","${row.pdi_status || ''}","${row.ciclo_nome || ''}",${row.acao_id || ''},"${row.acao_titulo || ''}","${(row.acao_descricao || '').replace(/"/g, '""').replace(/\n/g, ' ')}","${row.acao_status || ''}","${row.acao_prazo || ''}","${row.competencia_macro || ''}"`
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
  }),

  // ============= SOLICITAÇÕES DE AÇÕES POR EMPREGADOS =============
  solicitacoesAcoes: router({
    // Criar solicitação (Colaborador)
    criar: protectedProcedure
      .input(z.object({
        pdiId: z.number(),
        macroId: z.number(),
        microcompetencia: z.string().optional().nullable(),
        titulo: z.string().min(1, "Título é obrigatório"),
        descricao: z.string().optional(),
        prazo: z.string(),
        // Campos informativos para análise de aprovação
        porqueFazer: z.string().min(1, "'Por que fazer' é obrigatório"),
        ondeFazer: z.string().min(1, "'Onde fazer' é obrigatório"),
        linkEvento: z.string().optional(),
        previsaoInvestimento: z.string().min(1, "'Previsão de investimento' é obrigatório"),
        outrosProfissionaisParticipando: z.enum(['sim', 'nao']),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await db.createSolicitacaoAcao({
          ...input,
          prazo: new Date(input.prazo),
          solicitanteId: ctx.user.id,
        });

        // Notificar admins (CKM) sobre nova solicitação
        try {
          const admins = await db.getUsersByRole('admin');
          for (const admin of admins) {
            await db.createNotification({
              destinatarioId: admin.id,
              tipo: 'solicitacao_acao_nova',
              titulo: 'Nova Solicitação de Ação',
              mensagem: `${ctx.user.name} solicitou a inclusão de uma nova ação: "${input.titulo}". Aguardando seu parecer técnico.`,
              referenciaId: id,
            });
          }
        } catch (e) { console.error('Erro ao notificar admins:', e); }

        return { id, success: true };
      }),

    // Reenviar solicitação após revisão do RH (Solicitante edita e reenvia)
    reenviar: protectedProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().min(1, "Título é obrigatório"),
        descricao: z.string().optional(),
        prazo: z.string(),
        porqueFazer: z.string().min(1, "'Por que fazer' é obrigatório"),
        ondeFazer: z.string().min(1, "'Onde fazer' é obrigatório"),
        linkEvento: z.string().optional(),
        previsaoInvestimento: z.string().min(1, "'Previsão de investimento' é obrigatório"),
        outrosProfissionaisParticipando: z.enum(['sim', 'nao']),
      }))
      .mutation(async ({ ctx, input }) => {
        const solicitacao = await db.getSolicitacaoById(input.id);
        if (!solicitacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        if (solicitacao.solicitanteId !== ctx.user.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o solicitante pode reenviar' });
        }
        if (solicitacao.statusGeral !== 'aguardando_solicitante') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação não está aguardando revisão do solicitante' });
        }

        await db.reenviarSolicitacao(input.id, {
          titulo: input.titulo,
          descricao: input.descricao || '',
          prazo: new Date(input.prazo),
          porqueFazer: input.porqueFazer,
          ondeFazer: input.ondeFazer,
          linkEvento: input.linkEvento || null,
          previsaoInvestimento: input.previsaoInvestimento,
          outrosProfissionaisParticipando: input.outrosProfissionaisParticipando,
        });

        // Notificar admins (CKM) sobre reenvio
        try {
          const admins = await db.getUsersByRole('admin');
          for (const admin of admins) {
            await db.createNotification({
              destinatarioId: admin.id,
              tipo: 'solicitacao_acao_nova',
              titulo: 'Solicitação Reenviada — Nova Análise (Rodada 2)',
              mensagem: `${ctx.user.name} reenviou a solicitação de ação "${input.titulo}" após revisão solicitada pelo RH. Aguardando novo parecer técnico.`,
              referenciaId: input.id,
            });
          }
        } catch (e) { console.error('Erro ao notificar admins sobre reenvio:', e); }

        return { success: true };
      }),

    // Listar solicitações (adaptativo por papel)
    listar: protectedProcedure
      .input(z.object({
        statusGeral: z.string().optional(),
      }).optional())
      .query(async ({ ctx, input }) => {
        const role = ctx.user.role;
        const userId = ctx.user.id;

        if (role === 'admin') {
          // Admin (CKM) vê todas
          return await db.listSolicitacoesAcoes(input?.statusGeral ? { statusGeral: input.statusGeral } : undefined);
        } else if (role === 'gerente') {
          // Gerente (RH) vê todas
          return await db.listSolicitacoesAcoes(input?.statusGeral ? { statusGeral: input.statusGeral } : undefined);
        } else if (role === 'lider') {
          // Líder vê solicitações dos seus subordinados + as suas próprias (papel duplo)
          const todas = await db.listSolicitacoesAcoes(input?.statusGeral ? { statusGeral: input.statusGeral } : undefined);
          return todas.filter((s: any) => s.solicitanteLiderId === userId || s.solicitanteId === userId);
        } else {
          // Colaborador vê apenas as suas
          return await db.listSolicitacoesAcoes({ solicitanteId: userId, ...(input?.statusGeral ? { statusGeral: input.statusGeral } : {}) });
        }
      }),

    // Emitir parecer CKM (Admin)
    emitirParecerCKM: adminProcedure
      .input(z.object({
        id: z.number(),
        parecerTipo: z.enum(['com_aderencia', 'sem_aderencia']),
        parecerTexto: z.string().min(1, "Parecer é obrigatório"),
      }))
      .mutation(async ({ ctx, input }) => {
        const solicitacao = await db.getSolicitacaoById(input.id);
        if (!solicitacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        if (solicitacao.statusGeral !== 'aguardando_ckm') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação não está aguardando parecer CKM' });
        }

        await db.emitirParecerCKM(input.id, {
          parecerTipo: input.parecerTipo,
          parecerTexto: input.parecerTexto,
          adminId: ctx.user.id,
        });

        // Notificar o líder/gestor do solicitante (in-app + email)
        try {
          const solicitante = await db.getUserById(solicitacao.solicitanteId);
          if (solicitante?.leaderId) {
            // Notificação in-app
            await db.createNotification({
              destinatarioId: solicitante.leaderId,
              tipo: 'solicitacao_acao_aguardando_gestor',
              titulo: 'Solicitação de Ação Aguardando sua Decisão',
              mensagem: `A solicitação de ação "${solicitacao.titulo}" de ${solicitante.name} recebeu parecer da CKM e aguarda sua decisão.`,
              referenciaId: input.id,
            });

            // Enviar email para o líder
            const lider = await db.getUserById(solicitante.leaderId);
            if (lider?.email) {
              await sendEmailParecerCKMParaLider({
                liderEmail: lider.email,
                liderName: lider.name,
                colaboradorName: solicitante.name,
                tituloAcao: solicitacao.titulo,
                parecerTipo: input.parecerTipo,
                parecerTexto: input.parecerTexto,
                departamento: (solicitante as any).departamentoNome || undefined,
              });
              console.log(`[Email] Email enviado para líder ${lider.name} (${lider.email}) sobre parecer CKM da solicitação ${input.id}`);
            }
          }
        } catch (e) { console.error('Erro ao notificar gestor:', e); }

        return { success: true };
      }),

    // Decisão do Gestor (Líder)
    decisaoGestor: protectedProcedure
      .input(z.object({
        id: z.number(),
        decisao: z.enum(['aprovado', 'solicitar_revisao', 'encerrada']),
        justificativa: z.string().min(1, "Justificativa é obrigatória"),
        motivoRevisao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'lider' && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas gestores podem tomar esta decisão' });
        }

        const solicitacao = await db.getSolicitacaoById(input.id);
        if (!solicitacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        if (solicitacao.statusGeral !== 'aguardando_gestor') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação não está aguardando decisão do gestor' });
        }

        // === SOLICITAR REVISÃO (LÍDER) ===
        if (input.decisao === 'solicitar_revisao') {
          if (!input.motivoRevisao?.trim()) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'O motivo da revisão é obrigatório' });
          }
          if (solicitacao.liderRevisaoSolicitada) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Você já solicitou revisão nesta solicitação. Escolha De Acordo ou Encerrar Solicitação.' });
          }

          await db.solicitarRevisaoLider(input.id, {
            motivoRevisao: input.motivoRevisao,
            gestorId: ctx.user.id,
          });

          // Notificar admins (CKM) - in-app + email
          try {
            const admins = await db.getUsersByRole('admin');
            const solicitante = await db.getUserById(solicitacao.solicitanteId);
            for (const admin of admins) {
              await db.createNotification({
                destinatarioId: admin.id,
                tipo: 'solicitacao_acao_revisao_lider',
                titulo: 'Esclarecimento Solicitado pelo Líder',
                mensagem: `O líder ${ctx.user.name} solicitou esclarecimento sobre a solicitação de ação "${solicitacao.titulo}". Motivo: ${input.motivoRevisao}`,
                referenciaId: input.id,
              });

              if (admin.email) {
                await sendEmailRevisaoLiderParaCKM({
                  adminEmail: admin.email,
                  adminName: admin.name,
                  liderName: ctx.user.name,
                  colaboradorName: solicitante?.name || 'Colaborador',
                  tituloAcao: solicitacao.titulo,
                  motivoRevisao: input.motivoRevisao,
                  departamento: (solicitante as any)?.departamentoNome || undefined,
                });
                console.log(`[Email] Email enviado para admin ${admin.name} (${admin.email}) sobre esclarecimento solicitado pelo líder na solicitação ${input.id}`);
              }
            }
          } catch (e) { console.error('Erro ao notificar CKM sobre revisão do líder:', e); }

          return { success: true };
        }

        // === ENCERRAR SOLICITAÇÃO (LÍDER - 2a passagem) ===
        if (input.decisao === 'encerrada') {
          if (!solicitacao.liderRevisaoSolicitada) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Encerrar solicitação só é possível após uma revisão já ter sido solicitada.' });
          }

          await db.encerrarSolicitacaoLider(input.id, {
            justificativa: input.justificativa,
            gestorId: ctx.user.id,
          });

          // Notificar colaborador que foi encerrada (in-app + email)
          try {
            await db.createNotification({
              destinatarioId: solicitacao.solicitanteId,
              tipo: 'solicitacao_acao_encerrada',
              titulo: 'Solicitação de Ação Encerrada',
              mensagem: `Sua solicitação de ação "${solicitacao.titulo}" foi encerrada pelo líder após revisão.`,
              referenciaId: input.id,
            });

            // Enviar email para o colaborador + CC relacionamento
            const solicitante = await db.getUserById(solicitacao.solicitanteId);
            if (solicitante?.email) {
              await sendEmailSolicitacaoVetada({
                colaboradorEmail: solicitante.email,
                colaboradorName: solicitante.name,
                liderEmail: ctx.user.email || '',
                liderName: ctx.user.name,
                tituloAcao: solicitacao.titulo,
                vetadoPor: 'gestor',
                justificativa: input.justificativa,
                departamento: (solicitante as any).departamentoNome || undefined,
              });
              console.log(`[Email] Email enviado para colaborador ${solicitante.name} e líder ${ctx.user.name} - solicitação encerrada, CC relacionamento`);
            }
          } catch (e) { console.error('Erro ao notificar colaborador:', e); }

          return { success: true };
        }

        // === DE ACORDO (aprovado) ===
        await db.decisaoGestor(input.id, {
          decisao: input.decisao,
          justificativa: input.justificativa,
          gestorId: ctx.user.id,
        });

        // Notificar gerentes (RH) - in-app + email
        try {
          const gerentes = await db.getUsersByRole('gerente');
          const solicitante = await db.getUserById(solicitacao.solicitanteId);
          for (const gerente of gerentes) {
            await db.createNotification({
              destinatarioId: gerente.id,
              tipo: 'solicitacao_acao_aguardando_rh',
              titulo: 'Solicitação de Ação Aguardando sua Decisão',
              mensagem: `A solicitação de ação "${solicitacao.titulo}" foi aprovada pelo gestor e aguarda sua decisão final.`,
              referenciaId: input.id,
            });

            if (gerente.email) {
              await sendEmailParecerLiderParaGerente({
                gerenteEmail: gerente.email,
                gerenteName: gerente.name,
                liderName: ctx.user.name,
                colaboradorName: solicitante?.name || 'Colaborador',
                tituloAcao: solicitacao.titulo,
                decisaoLider: input.decisao,
                justificativaLider: input.justificativa,
                departamento: (solicitante as any)?.departamentoNome || undefined,
              });
              console.log(`[Email] Email enviado para gerente ${gerente.name} (${gerente.email}) sobre parecer do líder na solicitação ${input.id}`);
            }
          }
        } catch (e) { console.error('Erro ao notificar RH:', e); }

        return { success: true };
      }),

    // Decisão do RH (Gerente) - inclui ação no PDI se aprovada
    decisaoRH: protectedProcedure
      .input(z.object({
        id: z.number(),
        decisao: z.enum(['aprovado', 'reprovado', 'solicitar_revisao']),
        justificativa: z.string().min(1, "Justificativa é obrigatória"),
        motivoRevisao: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'gerente' && ctx.user.role !== 'admin') {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas o RH pode tomar esta decisão' });
        }

        const solicitacao = await db.getSolicitacaoById(input.id);
        if (!solicitacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        if (solicitacao.statusGeral !== 'aguardando_rh') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação não está aguardando decisão do RH' });
        }

        // === SOLICITAR REVISÃO ===
        if (input.decisao === 'solicitar_revisao') {
          if (!input.motivoRevisao?.trim()) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'O motivo da revisão é obrigatório' });
          }
          if (solicitacao.rodadaAtual >= 2) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Esta solicitação já passou por uma rodada de revisão. Não é possível solicitar nova revisão. Vete a solicitação e oriente o colaborador a abrir uma nova.' });
          }

          await db.solicitarRevisaoRH(input.id, {
            justificativa: input.justificativa,
            motivoRevisao: input.motivoRevisao,
            rhId: ctx.user.id,
            rhNome: ctx.user.name || 'RH',
          });

          // Notificar CKM/Admin (in-app + email)
          try {
            const admins = await db.getUsersByRole('admin');
            const solicitante = await db.getUserById(solicitacao.solicitanteId);
            for (const admin of admins) {
              // Notificação in-app
              await db.createNotification({
                destinatarioId: admin.id,
                tipo: 'solicitacao_acao_revisao',
                titulo: 'Revisão Solicitada — Nova Análise Necessária',
                mensagem: `O RH (${ctx.user.name}) solicitou revisão na solicitação de ação "${solicitacao.titulo}" de ${solicitante?.name || 'colaborador'}. Motivo: ${input.motivoRevisao}. É necessário emitir novo parecer técnico (Rodada 2).`,
                referenciaId: input.id,
              });

              // Enviar email
              if (admin.email) {
                await sendEmailRevisaoSolicitadaParaCKM({
                  adminEmail: admin.email,
                  adminName: admin.name,
                  rhName: ctx.user.name,
                  colaboradorName: solicitante?.name || null,
                  tituloAcao: solicitacao.titulo,
                  motivoRevisao: input.motivoRevisao,
                  departamento: (solicitante as any)?.departamentoNome || undefined,
                });
                console.log(`[Email] Email enviado para admin ${admin.name} (${admin.email}) - revisão solicitada pelo RH na solicitação ${input.id}`);
              }
            }
          } catch (e) { console.error('Erro ao notificar admins sobre revisão:', e); }

          return { success: true, acaoId: null };
        }

        // === APROVAR OU VETAR (fluxo original) ===
        const acaoId = await db.decisaoRH(input.id, {
          decisao: input.decisao,
          justificativa: input.justificativa,
          rhId: ctx.user.id,
        });

        // Notificar colaborador (in-app + email)
        try {
          const solicitante = await db.getUserById(solicitacao.solicitanteId);
          if (input.decisao === 'aprovado') {
            // Notificação in-app
            await db.createNotification({
              destinatarioId: solicitacao.solicitanteId,
              tipo: 'solicitacao_acao_aprovada',
              titulo: 'Solicitação de Ação Aprovada e Incluída no PDI',
              mensagem: `Sua solicitação de ação "${solicitacao.titulo}" foi aprovada e incluída no seu PDI!`,
              referenciaId: input.id,
            });

            // Enviar email para o colaborador
            if (solicitante?.email) {
              await sendEmailAcaoAprovadaParaColaborador({
                colaboradorEmail: solicitante.email,
                colaboradorName: solicitante.name,
                tituloAcao: solicitacao.titulo,
                departamento: (solicitante as any).departamentoNome || undefined,
              });
              console.log(`[Email] Email enviado para colaborador ${solicitante.name} (${solicitante.email}) - ação aprovada e incluída no PDI`);
            }

            // Enviar email para o líder informando da aprovação + CC relacionamento
            if (solicitante?.leaderId) {
              const lider = await db.getUserById(solicitante.leaderId);
              if (lider?.email) {
                await sendEmailAcaoAprovadaParaLider({
                  liderEmail: lider.email,
                  liderName: lider.name,
                  colaboradorName: solicitante.name,
                  tituloAcao: solicitacao.titulo,
                  departamento: (solicitante as any).departamentoNome || undefined,
                });
                console.log(`[Email] Email enviado para líder ${lider.name} (${lider.email}) - ação aprovada pelo RH, CC relacionamento`);
              }
            }
          } else {
            // Notificação in-app
            await db.createNotification({
              destinatarioId: solicitacao.solicitanteId,
              tipo: 'solicitacao_acao_vetada',
              titulo: 'Solicitação de Ação Não Aprovada',
              mensagem: `Sua solicitação de ação "${solicitacao.titulo}" não foi aprovada. Solicite feedback ao seu gestor sobre a motivação da decisão.`,
              referenciaId: input.id,
            });

            // Enviar email para o colaborador
            if (solicitante?.email) {
              await sendEmailAcaoReprovadaParaColaborador({
                colaboradorEmail: solicitante.email,
                colaboradorName: solicitante.name,
                tituloAcao: solicitacao.titulo,
                departamento: (solicitante as any).departamentoNome || undefined,
              });
              console.log(`[Email] Email enviado para colaborador ${solicitante.name} (${solicitante.email}) - ação não aprovada`);
            }

            // Enviar email para o líder informando do veto + CC relacionamento
            if (solicitante?.leaderId) {
              const lider = await db.getUserById(solicitante.leaderId);
              if (lider?.email) {
                await sendEmailSolicitacaoVetada({
                  colaboradorEmail: solicitante.email || '',
                  colaboradorName: solicitante.name,
                  liderEmail: lider.email,
                  liderName: lider.name,
                  tituloAcao: solicitacao.titulo,
                  vetadoPor: 'rh',
                  justificativa: input.justificativa,
                  departamento: (solicitante as any).departamentoNome || undefined,
                });
                console.log(`[Email] Email enviado para líder ${lider.name} (${lider.email}) - ação vetada pelo RH, CC relacionamento`);
              }
            }
          }
        } catch (e) { console.error('Erro ao notificar colaborador:', e); }

        return { success: true, acaoId };
      }),

    // Reenviar notificações pendentes (Admin)
    reenviarNotificacoesPendentes: adminProcedure
      .mutation(async () => {
        // Buscar todas as solicitações aguardando_gestor
        const solicitacoes = await db.listSolicitacoesAcoes({ statusGeral: 'aguardando_gestor' });

        if (solicitacoes.length === 0) {
          return { success: true, enviados: 0, falhas: 0, total: 0, detalhes: [] };
        }

        let enviados = 0;
        let falhas = 0;
        const detalhes: Array<{ id: number; titulo: string; colaborador: string; lider: string; status: string }> = [];

        for (const sol of solicitacoes) {
          try {
            const solicitante = await db.getUserById(sol.solicitanteId);
            if (!solicitante?.leaderId) {
              detalhes.push({ id: sol.id, titulo: sol.titulo, colaborador: solicitante?.name || 'N/A', lider: 'SEM LÍDER', status: 'falha' });
              falhas++;
              continue;
            }

            const lider = await db.getUserById(solicitante.leaderId);
            if (!lider?.email) {
              detalhes.push({ id: sol.id, titulo: sol.titulo, colaborador: solicitante.name, lider: lider?.name || 'SEM EMAIL', status: 'falha' });
              falhas++;
              continue;
            }

            await sendEmailParecerCKMParaLider({
              liderEmail: lider.email,
              liderName: lider.name,
              colaboradorName: solicitante.name,
              tituloAcao: sol.titulo,
              parecerTipo: sol.ckmParecerTipo || 'sem_aderencia',
              parecerTexto: sol.ckmParecerTexto || '',
              departamento: (solicitante as any).departamentoNome || undefined,
            });

            detalhes.push({ id: sol.id, titulo: sol.titulo, colaborador: solicitante.name, lider: `${lider.name} (${lider.email})`, status: 'enviado' });
            enviados++;
            console.log(`[Email Retroativo] Email enviado para líder ${lider.name} (${lider.email}) - solicitação #${sol.id}`);
          } catch (e) {
            console.error(`[Email Retroativo] Erro ao enviar email para solicitação #${sol.id}:`, e);
            detalhes.push({ id: sol.id, titulo: sol.titulo, colaborador: 'Erro', lider: 'Erro', status: 'erro' });
            falhas++;
          }
        }

        return { success: true, enviados, falhas, total: solicitacoes.length, detalhes };
      }),

    // Exportar relatório Excel das solicitações de ações
    exportarRelatorio: adminOrGerenteProcedure
      .query(async () => {
        const solicitacoes = await db.listSolicitacoesAcoes();
        
        return solicitacoes.map((s: any) => {
          // Mapear parecer CKM
          let parecerCKM = '';
          if (s.ckmParecerTipo === 'com_aderencia') parecerCKM = 'Com Aderência';
          else if (s.ckmParecerTipo === 'sem_aderencia') parecerCKM = 'Sem Aderência';

          // Mapear parecer do Líder
          let parecerLider = '';
          if (s.gestorDecisao === 'aprovado') parecerLider = 'De Acordo';
          else if (s.gestorDecisao === 'reprovado') parecerLider = 'Não Aprovado';
          else if (s.gestorDecisao === 'encerrada') parecerLider = 'Encerrada';

          // Mapear parecer do RH
          let parecerRH = '';
          if (s.rhDecisao === 'aprovado') parecerRH = 'Aprovado';
          else if (s.rhDecisao === 'reprovado') parecerRH = 'Vetado';
          // Verificar se está em revisão (aguardando_solicitante)
          if (s.statusGeral === 'aguardando_solicitante') parecerRH = 'Revisão Solicitada';

          // Formatar data
          const formatDateExport = (d: any) => {
            if (!d) return '';
            const date = new Date(d);
            return date.toLocaleDateString('pt-BR');
          };

          return {
            departamento: s.solicitanteDepartamento || '',
            lider: s.solicitanteLiderNome || '',
            empregado: s.solicitanteNome || '',
            tituloAcao: s.titulo || '',
            periodoExecucao: s.prazo ? formatDateExport(s.prazo) : '',
            valorInvestimento: s.previsaoInvestimento || '',
            parecerCKM,
            parecerLider,
            parecerRH,
            dataInclusao: formatDateExport(s.createdAt),
            statusGeral: s.statusGeral || '',
          };
        });
      }),

    // Devolver por Informações Incompletas (Admin/CKM)
    devolverPorInformacoesIncompletas: adminProcedure
      .input(z.object({
        id: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter no mínimo 10 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        const solicitacao = await db.getSolicitacaoById(input.id);
        if (!solicitacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        if (solicitacao.statusGeral !== 'aguardando_ckm') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação não está na etapa de análise CKM' });
        }

        await db.devolverPorInformacoesIncompletas(input.id, {
          justificativa: input.justificativa,
          adminId: ctx.user.id,
        });

        // Notificar o solicitante (in-app)
        try {
          await db.createNotification({
            destinatarioId: solicitacao.solicitanteId,
            tipo: 'solicitacao_acao_info_incompleta',
            titulo: 'Informações Incompletas — Ação Devolvida',
            mensagem: `Sua solicitação de ação "${solicitacao.titulo}" foi devolvida por informações incompletas. Motivo: ${input.justificativa}. Por favor, revise e reenvie.`,
            referenciaId: input.id,
          });
        } catch (e) { console.error('Erro ao notificar solicitante sobre devolução:', e); }

        return { success: true };
      }),

    // Excluir Parecer (Admin)
    excluirParecer: adminProcedure
      .input(z.object({
        id: z.number(),
        etapa: z.enum(['ckm', 'gestor', 'rh']),
        justificativa: z.string().min(5, "Justificativa é obrigatória"),
      }))
      .mutation(async ({ ctx, input }) => {
        const solicitacao = await db.getSolicitacaoById(input.id);
        if (!solicitacao) throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });

        // Validar que o parecer existe
        if (input.etapa === 'ckm' && !solicitacao.ckmParecerTipo) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não há parecer CKM para excluir' });
        }
        if (input.etapa === 'gestor' && !solicitacao.gestorDecisao) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não há parecer do gestor para excluir' });
        }
        if (input.etapa === 'rh' && !solicitacao.rhDecisao) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Não há parecer do RH para excluir' });
        }

        await db.excluirParecer(input.id, {
          etapa: input.etapa,
          adminId: ctx.user.id,
          justificativa: input.justificativa,
        });

        const etapaLabel = input.etapa === 'ckm' ? 'CKM' : input.etapa === 'gestor' ? 'Líder' : 'RH';
        console.log(`[Admin] Parecer ${etapaLabel} excluído na solicitação #${input.id} por ${ctx.user.name}. Motivo: ${input.justificativa}`);

        return { success: true };
      }),
   }),

  // ============= NORMAS E REGRAS =============
  normasRegras: router({
    // Listagem pública (todos os perfis autenticados)
    list: protectedProcedure
      .input(z.object({ apenasAtivas: z.boolean().optional().default(true) }).optional())
      .query(async ({ input }) => {
        return await db.listNormasRegras(input?.apenasAtivas ?? true);
      }),

    // CRUD - apenas admin
    create: adminProcedure
      .input(z.object({
        titulo: z.string().min(1),
        subtitulo: z.string().optional(),
        conteudo: z.string().min(1),
        icone: z.string().optional(),
        imagemUrl: z.string().optional(),
        categoria: z.string().optional(),
        ordem: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createNormaRegra(input);
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        titulo: z.string().optional(),
        subtitulo: z.string().optional(),
        conteudo: z.string().optional(),
        icone: z.string().optional(),
        imagemUrl: z.string().nullable().optional(),
        categoria: z.string().optional(),
        ordem: z.number().optional(),
        ativo: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateNormaRegra(id, data);
      }),

    uploadImagem: adminProcedure
      .input(z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileBase64: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { storagePut } = await import('./storage');
        const buffer = Buffer.from(input.fileBase64, 'base64');
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const fileKey = `normas-regras/${randomSuffix}-${input.fileName}`;
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        return { success: true, url };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteNormaRegra(input.id);
      }),

    // Versão atual das normas (incrementada pelo admin quando atualiza regras)
    versaoAtual: protectedProcedure
      .query(async () => {
        // Busca a maior versão de norma ativa, ou retorna 1 como padrão
        const normas = await db.listNormasRegras(true);
        return { versao: normas.length > 0 ? 1 : 0 };
      }),

    // Verificar se o usuário já viu as normas da versão atual
    verificarVisualizacao: protectedProcedure
      .query(async ({ ctx }) => {
        const { eq } = await import('drizzle-orm');
        const { users } = await import('../drizzle/schema');
        const database = await db.getDb();
        const [user] = await database.select({ viuNormasVersao: users.viuNormasVersao })
          .from(users)
          .where(eq(users.id, ctx.user.id));
        return { viuNormasVersao: user?.viuNormasVersao ?? 0 };
      }),

    // Marcar que o usuário viu as normas
    marcarComoVisto: protectedProcedure
      .input(z.object({ versao: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const { eq } = await import('drizzle-orm');
        const { users } = await import('../drizzle/schema');
        const database = await db.getDb();
        await database.update(users)
          .set({ viuNormasVersao: input.versao })
          .where(eq(users.id, ctx.user.id));
        return { success: true };
      }),

    // Admin: resetar flag de todos os usuários (forçar todos a verem novamente)
    resetarVisualizacoes: adminProcedure
      .mutation(async () => {
        const { users } = await import('../drizzle/schema');
        const database = await db.getDb();
        await database.update(users)
          .set({ viuNormasVersao: 0 });
        return { success: true };
      }),
  }),

  // ============= ROTINA DE ALERTA DE AÇÕES VENCIDAS =============
  alertaAcoesVencidas: router({
    executarVarredura: adminProcedure
      .mutation(async () => {
        try {
          const database = await db.getDb();
          const { sql: sqlTag } = await import('drizzle-orm');

          // Buscar ações vencidas há mais de 15 dias (prazo < hoje - 15 dias)
          // e que não estejam concluídas
          const [acoesVencidas]: any = await database.execute(sqlTag`
            SELECT 
              a.id as actionId,
              a.titulo as tituloAcao,
              a.prazo,
              a.status,
              p.id as pdiId,
              p.titulo as tituloPdi,
              p.colaboradorId,
              u.name as colaboradorName,
              u.email as colaboradorEmail,
              u.leaderId
            FROM actions a
            JOIN pdis p ON a.pdiId = p.id
            JOIN users u ON p.colaboradorId = u.id
            WHERE a.prazo < DATE_SUB(CURDATE(), INTERVAL 15 DAY)
              AND a.status NOT IN ('concluida', 'cancelada')
              AND p.status = 'em_andamento'
            ORDER BY u.id, p.id
          `);

          if (!acoesVencidas || acoesVencidas.length === 0) {
            return { success: true, empregadosNotificados: 0, lideresNotificados: 0, totalAcoesVencidas: 0 };
          }

          // Agrupar por empregado -> PDIs com ações vencidas
          const porEmpregado = new Map<number, {
            colaboradorName: string;
            colaboradorEmail: string;
            leaderId: number | null;
            pdis: Map<number, { tituloPdi: string; qtdAcoesVencidas: number }>;
          }>();

          for (const row of acoesVencidas) {
            if (!porEmpregado.has(row.colaboradorId)) {
              porEmpregado.set(row.colaboradorId, {
                colaboradorName: row.colaboradorName,
                colaboradorEmail: row.colaboradorEmail,
                leaderId: row.leaderId,
                pdis: new Map(),
              });
            }
            const emp = porEmpregado.get(row.colaboradorId)!;
            if (!emp.pdis.has(row.pdiId)) {
              emp.pdis.set(row.pdiId, { tituloPdi: row.tituloPdi, qtdAcoesVencidas: 0 });
            }
            emp.pdis.get(row.pdiId)!.qtdAcoesVencidas++;
          }

          let empregadosNotificados = 0;
          let lideresNotificados = 0;
          const lideresJaNotificados = new Map<number, Array<{ nomeColaborador: string; qtdAcoesVencidas: number }>>();

          // Enviar e-mail para cada empregado
          const empregadoEntries = Array.from(porEmpregado.entries());
          for (const [colabId, dados] of empregadoEntries) {
            if (dados.colaboradorEmail) {
              const pdisArray: Array<{ tituloPdi: string; qtdAcoesVencidas: number }> = Array.from(dados.pdis.values());
              try {
                await sendEmailAcoesVencidasEmpregado({
                  colaboradorEmail: dados.colaboradorEmail,
                  colaboradorName: dados.colaboradorName,
                  pdisComAcoesVencidas: pdisArray,
                });
                empregadosNotificados++;
              } catch (e) {
                console.warn(`[AlertaVencidas] Erro ao enviar e-mail para ${dados.colaboradorName}:`, e);
              }
            }

            // Acumular dados para o líder
            if (dados.leaderId) {
              if (!lideresJaNotificados.has(dados.leaderId)) {
                lideresJaNotificados.set(dados.leaderId, []);
              }
              const pdisValues: Array<{ tituloPdi: string; qtdAcoesVencidas: number }> = Array.from(dados.pdis.values());
              const totalAcoes: number = pdisValues.reduce((sum: number, p) => sum + p.qtdAcoesVencidas, 0);
              lideresJaNotificados.get(dados.leaderId)!.push({
                nomeColaborador: dados.colaboradorName,
                qtdAcoesVencidas: totalAcoes,
              });
            }
          }

          // Enviar e-mail consolidado para cada líder
          const lideresEntries = Array.from(lideresJaNotificados.entries());
          for (const [liderId, subordinados] of lideresEntries) {
            try {
              const lider = await db.getUserById(liderId);
              if (lider && lider.email) {
                await sendEmailAcoesVencidasLider({
                  liderEmail: lider.email,
                  liderName: lider.name || 'Líder',
                  subordinadosComPendencias: subordinados,
                });
                lideresNotificados++;
              }
            } catch (e) {
              console.warn(`[AlertaVencidas] Erro ao enviar e-mail para líder #${liderId}:`, e);
            }
          }

          console.log(`[AlertaVencidas] Varredura concluída: ${empregadosNotificados} empregados e ${lideresNotificados} líderes notificados. Total de ações vencidas: ${acoesVencidas.length}`);

          // Notificar todos os administradores com o resumo da varredura
          try {
            const [adminsRows]: any = await db.execute(sql.raw(`SELECT id, name, email FROM users WHERE role = 'admin' AND status = 'ativo' AND email IS NOT NULL AND email != ''`));
            const dataFormatada = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
            for (const admin of (adminsRows || [])) {
              try {
                await sendEmailResumoVarreduraAdmin({
                  adminEmail: admin.email,
                  adminName: admin.name || 'Administrador',
                  totalAcoesVencidas: acoesVencidas.length,
                  empregadosNotificados,
                  lideresNotificados,
                  dataVarredura: dataFormatada,
                });
                console.log(`[AlertaVencidas] Resumo enviado ao admin ${admin.name} (${admin.email})`);
              } catch (e) {
                console.warn(`[AlertaVencidas] Erro ao enviar resumo ao admin ${admin.email}:`, e);
              }
            }
          } catch (e) {
            console.warn('[AlertaVencidas] Erro ao notificar admins:', e);
          }

          return {
            success: true,
            empregadosNotificados,
            lideresNotificados,
            totalAcoesVencidas: acoesVencidas.length,
          };
        } catch (error: any) {
          console.error('[AlertaVencidas] Erro na varredura:', error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro ao executar varredura de ações vencidas: ${error.message}`
          });
        }
      }),
  }),
});
export type AppRouter = typeof appRouter;
