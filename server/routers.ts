import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure, router } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { authRouter } from "./authRouters";
import { importActionsRouter } from "./importActions";
import { sendEmailSolicitacaoAjuste } from "./_core/email";
// import { pdiRouter } from "./routers/pdi.router";
import { pdiAjustesRouter } from "./routers/pdi-ajustes.router";
import { notificationsRouter } from "./routers/notifications";
import { dashboardRouter } from "./routers/dashboard";
import { actionsRouter } from "./modules/actionsRouter";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  // pdi: pdiRouter,
  pdiAjustes: pdiAjustesRouter,
  notifications: notificationsRouter,
  dashboard: dashboardRouter,

  // ============= GESTÃO DE DEPARTAMENTOS =============
  departamentos: router({
    list: adminProcedure.query(async () => {
      return await db.getAllDepartamentos();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDepartamentoById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
        leaderId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDepartamento(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        leaderId: z.number().optional().nullable(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        
        // Atualizar departamento
        await db.updateDepartamento(id, data);
        
        // Se o líder foi alterado, sincronizar todos os usuários do departamento
        if (data.leaderId !== undefined) {
          await db.syncDepartmentLeader(id, data.leaderId);
        }
        
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDepartamento(input.id);
        return { success: true };
      }),
  }),

  // ============= GESTÃO DE USUÁRIOS =============
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getUserById(input.id);
      }),

    buscarPorCpf: publicProcedure
      .input(z.object({ cpf: z.string() }))
      .query(async ({ input }) => {
        // Limpar CPF removendo formatação (pontos, traços, espaços)
        const cpfLimpoInput = input.cpf.replace(/\D/g, "");
        
        // Busca insensível a caracteres especiais - compara ambos limpos
        const usersList = await db.getAllUsers();
        const userExistente = usersList.find(u => u.cpf?.replace(/\D/g, "") === cpfLimpoInput);
        return userExistente || null;
      }),
    buscarPorEmail: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .query(async ({ input }) => {
        const emailLimpo = input.email.toLowerCase().trim();
        const usersList = await db.getAllUsers();
        const userExistente = usersList.find(u => u.email?.toLowerCase().trim() === emailLimpo);
        return userExistente || null;
      }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        email: z.string().email("Email inválido"),
        cpf: z.string().min(11, "CPF inválido").max(14),
        role: z.enum(["admin", "lider", "colaborador"]),
        cargo: z.string().min(1, "Cargo é obrigatório"),
        leaderId: z.number().optional(),
        departamentoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Limpar CPF removendo formatação (pontos e traços)
        const cpfParaSalvar = input.cpf.replace(/\D/g, ""); // Normalizar antes de salvar
        
        // Verificar se CPF já existe
        const existingUser = await db.getUserByCpf(cpfParaSalvar);
        if (existingUser) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'Este CPF já está cadastrado no sistema.' 
          });
        }

        // NOTA: Validações de departamento e líder foram movidas para users.update
        // Na criação inicial, usuário pode ser criado sem departamento/líder
        // Configuração será feita posteriormente na página /usuarios/:id/configurar

        // Verificar se líder existe e se está no mesmo departamento
        if (input.leaderId) {
          const leader = await db.getUserById(input.leaderId);
          if (!leader) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Líder não encontrado.' 
            });
          }
          
          // NOTA: Usuário pode estar em departamento diferente do líder (dualidade de roles)
          // Validação removida para permitir: Lidera Depto A, Colaborador em Depto B
        }

        // Verificar se departamento existe
        if (input.departamentoId) {
          const departamento = await db.getDepartamentoById(input.departamentoId);
          if (!departamento) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Departamento não encontrado.' 
            });
          }
        }

        await db.createUser({
          openId: `local_${cpfParaSalvar}`,
          name: input.name,
          email: input.email,
          cpf: cpfParaSalvar,
          role: input.role,
          cargo: input.cargo,
          leaderId: input.leaderId,
          departamentoId: input.departamentoId,
          status: "ativo",
        });

        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        cpf: z.string().min(11).max(14).optional(),
        role: z.enum(["admin", "lider", "colaborador"]).optional(),
        cargo: z.string().min(1).optional(),
        leaderId: z.number().optional(),
        departamentoId: z.number().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        
        // Limpar CPF removendo formatação (pontos e traços)
        if (updateData.cpf) {
          updateData.cpf = updateData.cpf.replace(/[^\d]/g, "");
        }

        // Buscar usuário atual
        const currentUser = await db.getUserById(id);
        if (!currentUser) {
          throw new TRPCError({ 
            code: 'NOT_FOUND', 
            message: 'Usuário não encontrado.' 
          });
        }

        // Determinar o role final (atual ou atualizado)
        const finalRole = updateData.role || currentUser.role;
        const finalLeaderId = updateData.leaderId !== undefined ? updateData.leaderId : currentUser.leaderId;
        const finalDepartamentoId = updateData.departamentoId !== undefined ? updateData.departamentoId : currentUser.departamentoId;

        // VALIDAÇÃO: Líder e Colaborador DEVEM ter departamento
        if (finalRole === 'lider' || finalRole === 'colaborador') {
          if (!finalDepartamentoId) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `${finalRole === 'lider' ? 'Líderes' : 'Colaboradores'} devem estar vinculados a um departamento.` 
            });
          }
          
          // Buscar líder automaticamente do departamento
          const departamento = await db.getDepartamentoById(finalDepartamentoId);
          if (departamento && departamento.leaderId) {
            updateData.leaderId = departamento.leaderId;
          }
        }

        // Se CPF está sendo atualizado, verificar duplicidade
        if (updateData.cpf) {
          const existingUser = await db.getUserByCpf(updateData.cpf);
          if (existingUser && existingUser.id !== id) {
            throw new TRPCError({ 
              code: 'CONFLICT', 
              message: 'Este CPF já está cadastrado no sistema.' 
            });
          }
        }

        // Verificar auto-atribuição de líder
        if (updateData.leaderId === id) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Um usuário não pode ser seu próprio líder.' 
          });
        }

        // NOTA: Usuário pode estar em departamento diferente do líder (dualidade de roles)
        // Validação removida para permitir: Lidera Depto A, Colaborador em Depto B
        if (finalLeaderId) {
          const leader = await db.getUserById(finalLeaderId);
          if (!leader) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Líder não encontrado.' 
            });
          }
        }

        await db.updateUser(id, updateData);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.id);
        return { success: true };
      }),

    getSubordinates: adminOrLeaderProcedure
      .input(z.object({ leaderId: z.number() }))
      .query(async ({ input }) => {
        return await db.getSubordinates(input.leaderId);
      }),

    importBulk: adminProcedure
      .input(z.object({
        users: z.array(z.object({
          name: z.string(),
          email: z.string().optional(),
          cpf: z.string(),
          cargo: z.string(),
          role: z.enum(["admin", "lider", "colaborador"]),
          departamento: z.string(),
        }))
      }))
      .mutation(async ({ input }) => {
        const results = {
          success: 0,
          errors: [] as string[],
          departamentosCreated: 0,
          lidersCreated: 0,
          colaboradoresCreated: 0,
        };

        try {
          // 1. Criar todos os departamentos únicos
          const departamentosUnicos = Array.from(new Set(input.users.map(u => u.departamento)));
          const departamentosMap = new Map<string, number>();

          for (const deptNome of departamentosUnicos) {
            try {
              // Verificar se departamento já existe
              const existingDepts = await db.getAllDepartamentos();
              const existing = existingDepts.find(d => d.nome === deptNome);
              
              if (existing) {
                departamentosMap.set(deptNome, existing.id);
              } else {
                await db.createDepartamento({ nome: deptNome });
                const newDepts = await db.getAllDepartamentos();
                const newDept = newDepts.find(d => d.nome === deptNome);
                if (newDept) {
                  departamentosMap.set(deptNome, newDept.id);
                  results.departamentosCreated++;
                }
              }
            } catch (error: any) {
              results.errors.push(`Erro ao criar departamento ${deptNome}: ${error.message}`);
            }
          }

          // 2. Primeiro, criar todos os líderes
          const lideres = input.users.filter(u => u.role === 'lider');
          const lideresMap = new Map<string, number>();

          for (const lider of lideres) {
            try {
              // Verificar se usuário já existe
              const existing = await db.getUserByCpf(lider.cpf);
              if (existing) {
                lideresMap.set(`${lider.departamento}`, existing.id);
                continue;
              }

              const departamentoId = departamentosMap.get(lider.departamento);
              if (!departamentoId) {
                results.errors.push(`Departamento não encontrado para líder ${lider.name}`);
                continue;
              }

              await db.createUser({
                openId: `local_${lider.cpf}`,
                name: lider.name,
                email: lider.email || `${lider.cpf}@temp.com`,
                cpf: lider.cpf,
                role: 'lider',
                cargo: lider.cargo,
                departamentoId,
                status: 'ativo',
              });

              const newUser = await db.getUserByCpf(lider.cpf);
              if (newUser) {
                lideresMap.set(`${lider.departamento}`, newUser.id);
                results.lidersCreated++;
                results.success++;

                // Atualizar departamento com o líder
                await db.updateDepartamento(departamentoId, { leaderId: newUser.id });
              }
            } catch (error: any) {
              results.errors.push(`Erro ao criar líder ${lider.name}: ${error.message}`);
            }
          }

          // 3. Criar colaboradores e vinculá-los aos líderes
          const colaboradores = input.users.filter(u => u.role === 'colaborador');

          for (const colab of colaboradores) {
            try {
              // Verificar se usuário já existe
              const existing = await db.getUserByCpf(colab.cpf);
              if (existing) {
                continue;
              }

              const departamentoId = departamentosMap.get(colab.departamento);
              if (!departamentoId) {
                results.errors.push(`Departamento não encontrado para ${colab.name}`);
                continue;
              }
              const leaderId = lideresMap.get(`${colab.departamento}`);

              await db.createUser({
                openId: `local_${colab.cpf}`,
                name: colab.name,
                email: colab.email || `${colab.cpf}@temp.com`,
                cpf: colab.cpf,
                role: 'colaborador',
                cargo: colab.cargo,
                departamentoId,
                leaderId,
                status: 'ativo',
              });

              results.colaboradoresCreated++;
              results.success++;
            } catch (error: any) {
              results.errors.push(`Erro ao criar colaborador ${colab.name}: ${error.message}`);
            }
          }

          return results;
        } catch (error: any) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Erro na importação: ${error.message}`,
          });
        }
      }),
  }),

  // ============= GESTÃO DE COMPETÊNCIAS =============
  competencias: router({
    // BLOCOS
    listBlocos: protectedProcedure.query(async () => {
      return await db.getAllBlocos();
    }),

    getBlocoById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBlocoById(input.id);
      }),

    criarBloco: adminProcedure
      .input(z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createBloco(input);
        return { success: true };
      }),

    atualizarBloco: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateBloco(id, updateData);
        return { success: true };
      }),

    deletarBloco: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBloco(input.id);
        return { success: true };
      }),

    // MACROS
    listMacros: protectedProcedure
      .input(z.object({ blocoId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMacrosByBlocoId(input.blocoId);
      }),

    listAllMacros: protectedProcedure.query(async () => {
      return await db.getAllMacros();
    }),

    getMacroById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMacroById(input.id);
      }),

    criarMacro: adminProcedure
      .input(z.object({
        blocoId: z.number(),
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createMacro(input);
        return { success: true };
      }),

    atualizarMacro: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        blocoId: z.number().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateMacro(id, updateData);
        return { success: true };
      }),

    deletarMacro: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMacro(input.id);
        return { success: true };
      }),

    // MICROS
    listMicros: protectedProcedure
      .input(z.object({ macroId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMicrosByMacroId(input.macroId);
      }),

    listAllMicros: protectedProcedure.query(async () => {
      return await db.getAllMicros();
    }),

    listAllMicrosWithDetails: protectedProcedure.query(async () => {
      return await db.getAllMicrosWithMacroAndBloco();
    }),

    getCompetenciasHierarchy: protectedProcedure
      .input(z.object({
        blocoNome: z.string().optional(),
        macroNome: z.string().optional(),
        microNome: z.string().optional(),
        status: z.enum(['ativo', 'inativo']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return await db.getCompetenciasHierarchy(input);
      }),

    getMicrosWithFilters: protectedProcedure
      .input(z.object({
        blocoId: z.number().optional(),
        blocoNome: z.string().optional(),
        macroId: z.number().optional(),
        macroNome: z.string().optional(),
        microNome: z.string().optional(),
        status: z.enum(['ativo', 'inativo']).optional(),
      }))
      .query(async ({ input }) => {
        return await db.getMicrosWithFilters(input);
      }),

    getMicroById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMicroById(input.id);
      }),

    criarMicro: adminProcedure
      .input(z.object({
        macroId: z.number(),
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createMicro(input);
        return { success: true };
      }),

    atualizarMicro: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        descricao: z.string().optional(),
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        await db.updateMicro(id, updateData);
        return { success: true };
      }),

    deletarMicro: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMicro(input.id);
        return { success: true };
      }),

    inativarMicro: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateMicro(input.id, { status: 'inativo' });
        return { success: true };
      }),

    editarMicro: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, nome, descricao } = input;
        await db.updateMicro(id, { nome, descricao });
        return { success: true };
      }),

    inativarMacroComCascata: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Validar se há Micros ativas vinculadas
        const activeMicrosCount = await db.countActiveMicrosByMacroId(input.id);
        if (activeMicrosCount > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Não é possível inativar esta Macro. Você deve inativar todas as ${activeMicrosCount} Microcompetência(s) vinculada(s) a ela primeiro.`
          });
        }
        await db.deleteMacro(input.id);
        return { success: true };
      }),

    editarMacro: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, nome, descricao } = input;
        await db.updateMacro(id, { nome, descricao });
        return { success: true };
      }),

    inativarBlocoComCascata: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        // Validar se há Macros ativas vinculadas
        const activeMacrosCount = await db.countActiveMacrosByBlocoId(input.id);
        if (activeMacrosCount > 0) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Não é possível inativar este Bloco. Você deve inativar todas as ${activeMacrosCount} Macrocompetência(s) vinculada(s) a ele primeiro.`
          });
        }
        await db.deleteBloco(input.id);
        return { success: true };
      }),

    editarBloco: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, nome, descricao } = input;
        await db.updateBloco(id, { nome, descricao });
        return { success: true };
      }),

    ativarMicro: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateMicro(input.id, { status: 'ativo' });
        return { success: true };
      }),

    ativarMacro: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateMacro(input.id, { status: 'ativo' });
        return { success: true };
      }),

    ativarBloco: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.updateBloco(input.id, { status: 'ativo' });
        return { success: true };
      }),

    // DIRECIONAMENTO ESTRATÉGICO - TOP 3 COMPETÊNCIAS COM GAPS (ADMIN ONLY)
    getTop3CompetenciasComGaps: adminProcedure.query(async () => {
      return await db.getTop3CompetenciasComGaps();
    }),

    // IMPORTAÇÃO EM MASSA (NOVO - COM NOMES CORRETOS)
    importarEmLote: adminProcedure
      .input(z.object({
        competencias: z.array(z.object({
          blocoNome: z.string().min(1),
          blocoDescricao: z.string().optional(),
          macroNome: z.string().min(1),
          macroDescricao: z.string().optional(),
          microNome: z.string().min(1),
          microDescricao: z.string().optional(),
        }))
      }))
      .mutation(async ({ input }) => {
        const { competencias } = input;
        const erros: { linha: number; erro: string }[] = [];
        let sucesso = 0;
        const blocoMap = new Map<string, number>();
        const macroMap = new Map<string, number>();
        
        for (let idx = 0; idx < competencias.length; idx++) {
          const comp = competencias[idx];
          const linha = idx + 2;
          try {
            let blocoId: number;
            if (blocoMap.has(comp.blocoNome)) {
              blocoId = blocoMap.get(comp.blocoNome)!;
            } else {
              const existingBloco = await db.getBlocoByNome(comp.blocoNome);
              if (existingBloco) {
                blocoId = existingBloco.id;
              } else {
                const newBloco = await db.createBloco({ nome: comp.blocoNome, descricao: comp.blocoDescricao });
                blocoId = newBloco.id;
              }
              blocoMap.set(comp.blocoNome, blocoId);
            }
            
            const macroKey = `${blocoId}-${comp.macroNome}`;
            let macroId: number;
            if (macroMap.has(macroKey)) {
              macroId = macroMap.get(macroKey)!;
            } else {
              const existingMacro = await db.getMacroByNomeAndBlocoId(comp.macroNome, blocoId);
              if (existingMacro) {
                macroId = existingMacro.id;
              } else {
                const newMacro = await db.createMacro({ blocoId, nome: comp.macroNome, descricao: comp.macroDescricao });
                macroId = newMacro.id;
              }
              macroMap.set(macroKey, macroId);
            }
            
            const existingMicro = await db.getMicroByNomeAndMacroId(comp.microNome, macroId);
            if (!existingMicro) {
              await db.createMicro({ macroId, nome: comp.microNome, descricao: comp.microDescricao });
            }
            sucesso++;
          } catch (erro: any) {
            erros.push({ linha, erro: erro.message || "Erro desconhecido" });
          }
        }
        return { sucesso, erros };
      }),

    // IMPORTAÇÃO EM MASSA (ANTIGO)
    importBulk: adminProcedure
      .input(z.object({
        competencias: z.array(z.object({
          modulo: z.string(),
          macro: z.string(),
          micro: z.string(),
        }))
      }))
      .mutation(async ({ input }) => {
        const { competencias } = input;
        
        // Maps para evitar duplicação
        const blocoMap = new Map<string, number>();
        const macroMap = new Map<string, number>();
        
        let created = { blocos: 0, macros: 0, micros: 0 };
        let skipped = { blocos: 0, macros: 0, micros: 0 };
        
        for (const comp of competencias) {
          // 1. Criar ou buscar Bloco
          let blocoId: number;
          if (blocoMap.has(comp.modulo)) {
            blocoId = blocoMap.get(comp.modulo)!;
            skipped.blocos++;
          } else {
            // Verificar se já existe no banco
            const existingBloco = await db.getBlocoByNome(comp.modulo);
            if (existingBloco) {
              blocoId = existingBloco.id;
              blocoMap.set(comp.modulo, blocoId);
              skipped.blocos++;
            } else {
              const newBloco = await db.createBloco({ nome: comp.modulo });
              blocoId = newBloco.id;
              blocoMap.set(comp.modulo, blocoId);
              created.blocos++;
            }
          }
          
          // 2. Criar ou buscar Macro
          const macroKey = `${blocoId}-${comp.macro}`;
          let macroId: number;
          if (macroMap.has(macroKey)) {
            macroId = macroMap.get(macroKey)!;
            skipped.macros++;
          } else {
            // Verificar se já existe no banco
            const existingMacro = await db.getMacroByNomeAndBlocoId(comp.macro, blocoId);
            if (existingMacro) {
              macroId = existingMacro.id;
              macroMap.set(macroKey, macroId);
              skipped.macros++;
            } else {
              const newMacro = await db.createMacro({ blocoId, nome: comp.macro });
              macroId = newMacro.id;
              macroMap.set(macroKey, macroId);
              created.macros++;
            }
          }
          
          // 3. Criar Micro (sempre criar, mesmo se duplicado)
          const existingMicro = await db.getMicroByNomeAndMacroId(comp.micro, macroId);
          if (existingMicro) {
            skipped.micros++;
          } else {
            await db.createMicro({ macroId, nome: comp.micro });
            created.micros++;
          }
        }
        
        return { 
          success: true, 
          created,
          skipped,
          total: competencias.length 
        };
      }),
  }),

  // ============= GESTÃO DE CICLOS =============
  ciclos: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllCiclos();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCicloById(input.id);
      }),

    create: adminProcedure
      .input(z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        dataInicio: z.string(),
        dataFim: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dataInicio = new Date(input.dataInicio);
        const dataFim = new Date(input.dataFim);

        // Validar datas
        if (dataFim <= dataInicio) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'A data de fim deve ser posterior à data de início.' 
          });
        }

        // Verificar sobreposição de ciclos
        const ciclosExistentes = await db.getAllCiclos();
        for (const ciclo of ciclosExistentes) {
          const cicloInicio = new Date(ciclo.dataInicio);
          const cicloFim = new Date(ciclo.dataFim);
          
          if (
            (dataInicio >= cicloInicio && dataInicio <= cicloFim) ||
            (dataFim >= cicloInicio && dataFim <= cicloFim) ||
            (dataInicio <= cicloInicio && dataFim >= cicloFim)
          ) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `Este ciclo se sobrepõe ao ciclo "${ciclo.nome}".` 
            });
          }
        }

        await db.createCiclo({
          nome: input.nome,
          dataInicio,
          dataFim,
        });

        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(1).optional(),
        dataInicio: z.string().optional(),
        dataFim: z.string().optional(),
        status: z.enum(["ativo", "encerrado"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, dataInicio, dataFim, ...rest } = input;
        
        const updateData: any = { ...rest };
        
        if (dataInicio) {
          updateData.dataInicio = new Date(dataInicio);
        }
        if (dataFim) {
          updateData.dataFim = new Date(dataFim);
        }

        // Validar datas se ambas forem fornecidas
        if (updateData.dataInicio && updateData.dataFim) {
          if (updateData.dataFim <= updateData.dataInicio) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'A data de fim deve ser posterior à data de início.' 
            });
          }
        }

        await db.updateCiclo(id, updateData);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCiclo(input.id);
        return { success: true };
      }),

    findByDate: protectedProcedure
      .input(z.object({ date: z.string() }))
      .query(async ({ input }) => {
        return await db.findCycloBiDate(input.date);
      }),
  }),

  // ============= GESTÃO DE PDIs =============
  pdis: router({
    list: adminProcedure.query(async () => {
      return await db.getAllPDIs();
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getPDIById(input.id);
      }),

    getByColaborador: protectedProcedure
      .input(z.object({ colaboradorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPDIsByColaboradorId(input.colaboradorId);
      }),

    getByCiclo: protectedProcedure
      .input(z.object({ cicloId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPDIsByCicloId(input.cicloId);
      }),

    myPDIs: protectedProcedure.query(async ({ ctx }) => {
      return await db.getPDIsByColaboradorId(ctx.user!.id);
    }),

    teamPDIs: protectedProcedure.query(async ({ ctx }) => {
      // Buscar subordinados diretos do líder
      const subordinados = await db.getSubordinates(ctx.user!.id);
      
      if (subordinados.length === 0) {
        return [];
      }
      
      // Buscar PDIs de todos os subordinados
      const teamPDIs = [];
      for (const subordinado of subordinados) {
        const pdis = await db.getPDIsByColaboradorId(subordinado.id);
        teamPDIs.push(...pdis);
      }
      
      return teamPDIs;
    }),

    create: adminProcedure
      .input(z.object({
        colaboradorId: z.number(),
        cicloId: z.number(),
        titulo: z.string().min(1, "Título é obrigatório"),
        objetivoGeral: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validar se já existe PDI para este colaborador neste ciclo
        const existingPDIs = await db.getPDIsByColaboradorId(input.colaboradorId);
        const duplicatePDI = existingPDIs.find(pdi => pdi.cicloId === input.cicloId);
        
        if (duplicatePDI) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Já existe um PDI para este usuário neste ciclo. Cada usuário pode ter apenas 1 PDI por ciclo.',
          });
        }

        await db.createPDI({
          ...input,
          createdBy: ctx.user!.id,
        });
        return { success: true };
      }),

    createBulk: adminProcedure
      .input(z.object({
        cicloId: z.number(),
        titulo: z.string().min(1, "Título é obrigatório"),
        objetivoGeral: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Buscar todos os colaboradores ativos (exceto admins)
        const allUsers = await db.getAllUsers();
        const colaboradores = allUsers.filter(
          user => user.status === "ativo" && (user.role === "colaborador" || user.role === "lider")
        );

        if (colaboradores.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Nenhum colaborador ativo encontrado no sistema.',
          });
        }

        // Buscar PDIs existentes para este ciclo
        const existingPDIs = await db.getPDIsByCicloId(input.cicloId);
        const existingColaboradorIds = new Set(existingPDIs.map(pdi => pdi.colaboradorId));

        // Filtrar colaboradores que ainda não têm PDI neste ciclo
        const colaboradoresSemPDI = colaboradores.filter(
          colab => !existingColaboradorIds.has(colab.id)
        );

        if (colaboradoresSemPDI.length === 0) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Todos os colaboradores já possuem PDI neste ciclo.',
          });
        }

        // Criar PDI para cada colaborador
        let created = 0;
        for (const colaborador of colaboradoresSemPDI) {
          await db.createPDI({
            colaboradorId: colaborador.id,
            cicloId: input.cicloId,
            titulo: input.titulo,
            objetivoGeral: input.objetivoGeral,
            createdBy: ctx.user!.id,
          });
          created++;
        }

        return { 
          success: true, 
          created,
          skipped: colaboradores.length - created,
          total: colaboradores.length
        };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["em_andamento", "concluido", "cancelado"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updatePDI(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteUser(input.id);
        return { success: true };
      }),

  }),

  // ============= GESTÃO DE AÇÕES =============
  actions: actionsRouter,

  // ============= EVIDÊNcias =============
  evidences: router({
    create: protectedProcedure
      .input(z.object({
        actionId: z.number(),
        files: z.array(z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
          fileUrl: z.string(), // base64 data URL
          fileKey: z.string(),
        })).optional(),
        texts: z.array(z.object({
          titulo: z.string().optional(),
          texto: z.string(),
        })).optional(),
        satisfactionScore: z.number().min(1).max(5).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Import storagePut at the top of the file
        const { storagePut } = await import('server/storage');
        // 1. Verificar se a ação existe e pertence ao colaborador
        const action = await db.getActionById(input.actionId);
        if (!action) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }

        // 2. Verificar se o PDI pertence ao colaborador
        const pdi = await db.getPDIById(action.pdiId);
        if (!pdi || pdi.colaboradorId !== ctx.user!.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para adicionar evidências a esta ação' });
        }

        // 3. Criar evidência
        const evidenceId = await db.createEvidence({
          actionId: input.actionId,
          colaboradorId: ctx.user!.id,
          satisfactionScore: input.satisfactionScore,
        });

        // 4. Adicionar arquivos (fazer upload para S3)
        if (input.files && input.files.length > 0) {
          for (const file of input.files) {
            try {
              // Fazer upload do arquivo para S3
              const { url: s3Url } = await storagePut(
                file.fileKey,
                file.fileUrl, // base64 string
                file.fileType
              );
              
              // Armazenar apenas a URL do S3 no banco de dados
              await db.addEvidenceFile({
                evidenceId,
                fileName: file.fileName,
                fileType: file.fileType,
                fileSize: file.fileSize,
                fileUrl: s3Url, // URL do S3, não o base64
                fileKey: file.fileKey,
              });
            } catch (uploadError) {
              console.error(`Erro ao fazer upload do arquivo ${file.fileName}:`, uploadError);
              throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Erro ao fazer upload do arquivo ${file.fileName}`,
              });
            }
          }
        }

        // 5. Adicionar textos
        if (input.texts && input.texts.length > 0) {
          for (const text of input.texts) {
            await db.addEvidenceText({
              evidenceId,
              ...text,
            });
          }
        }

        // 6. Atualizar status da ação para "evidencia_enviada"
        await db.updateAction(action.id, { status: 'evidencia_enviada' });

        // 7. Criar histórico
        await db.createAcaoHistorico({
          actionId: action.id,
          campo: 'status',
          valorAnterior: action.status,
          valorNovo: 'evidencia_enviada',
          motivoAlteracao: 'Evidência enviada pelo colaborador',
          alteradoPor: ctx.user!.id,
        });

        // 8. Notificar Admin
        const admins = await db.getUsersByRole('admin');
        for (const admin of admins) {
          await db.createNotification({
            destinatarioId: admin.id,
            tipo: 'evidencia_enviada',
            titulo: '📎 Nova Evidência Enviada',
            mensagem: `${ctx.user!.name} enviou evidência para a ação "${action.nome}".`,
            referenciaId: action.id,
          });
        }

        // 9. Notificar Líder
        const colaborador = await db.getUserById(ctx.user!.id);
        if (colaborador && colaborador.leaderId) {
          await db.createNotification({
            destinatarioId: colaborador.leaderId,
            tipo: 'evidencia_enviada_info',
            titulo: '📎 Evidência Enviada',
            mensagem: `Seu liderado ${ctx.user!.name} enviou evidência para a ação "${action.nome}".`,
            referenciaId: action.id,
          });
        }

        return { success: true, evidenceId };
      }),

    listByAction: protectedProcedure
      .input(z.object({ actionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEvidencesByActionId(input.actionId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEvidenceById(input.id);
      }),

    getPending: adminProcedure.query(async () => {
      return await db.getPendingEvidences();
    }),

    aprovar: adminProcedure
      .input(z.object({
        evidenceId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Buscar evidência
        const evidence = await db.getEvidenceById(input.evidenceId);
        if (!evidence) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
        }

        if (evidence.status !== 'aguardando_avaliacao') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Evidência já foi avaliada' });
        }

        // 2. Atualizar status da evidência
        await db.updateEvidenceStatus(input.evidenceId, {
          status: 'aprovada',
          evaluatedBy: ctx.user!.id,
          evaluatedAt: new Date(),
        });

        // 3. Atualizar status da ação para "evidencia_aprovada"
        await db.updateAction(evidence.actionId, { status: 'evidencia_aprovada' });

        // 4. Criar histórico
        await db.createAcaoHistorico({
          actionId: evidence.actionId,
          campo: 'status',
          valorAnterior: 'evidencia_enviada',
          valorNovo: 'evidencia_aprovada',
          motivoAlteracao: 'Evidência aprovada pelo Admin',
          alteradoPor: ctx.user!.id,
        });

        // 5. Notificar Colaborador
        await db.createNotification({
          destinatarioId: evidence.colaboradorId,
          tipo: 'evidencia_aprovada',
          titulo: '✅ Evidência Aprovada',
            mensagem: `Sua evidência para a ação "${evidence.actionNome}" foi aprovada pelo Admin.`,
          referenciaId: evidence.actionId,
        });

        // 6. Notificar Líder
        const colaborador = await db.getUserById(evidence.colaboradorId);
        if (colaborador && colaborador.leaderId) {
          await db.createNotification({
            destinatarioId: colaborador.leaderId,
            tipo: 'evidencia_aprovada_info',
            titulo: '✅ Evidência Aprovada',
            mensagem: `Evidência do seu liderado ${evidence.colaboradorNome} para a ação "${evidence.actionNome}" foi aprovada.`,
            referenciaId: evidence.actionId,
          });
        }

        return { success: true };
      }),

    reprovar: adminProcedure
      .input(z.object({
        evidenceId: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter pelo menos 10 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Buscar evidência
        const evidence = await db.getEvidenceById(input.evidenceId);
        if (!evidence) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evidência não encontrada' });
        }

        if (evidence.status !== 'aguardando_avaliacao') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Evidência já foi avaliada' });
        }

        // 2. Atualizar status da evidência
        await db.updateEvidenceStatus(input.evidenceId, {
          status: 'reprovada',
          justificativaAdmin: input.justificativa,
          evaluatedBy: ctx.user!.id,
          evaluatedAt: new Date(),
        });

        // 3. Atualizar status da ação para "evidencia_reprovada"
        await db.updateAction(evidence.actionId, { status: 'evidencia_reprovada' });

        // 4. Criar histórico
        await db.createAcaoHistorico({
          actionId: evidence.actionId,
          campo: 'status',
          valorAnterior: 'evidencia_enviada',
          valorNovo: 'evidencia_reprovada',
          motivoAlteracao: `Evidência reprovada pelo Admin. Justificativa: ${input.justificativa}`,
          alteradoPor: ctx.user!.id,
        });

        // 5. Notificar Colaborador
        await db.createNotification({
          destinatarioId: evidence.colaboradorId,
          tipo: 'evidencia_reprovada',
          titulo: '❌ Evidência Reprovada',
          mensagem: `Sua evidência para a ação "${evidence.actionNome}" foi reprovada. Justificativa: ${input.justificativa}`,
          referenciaId: evidence.actionId,
        });

        // 6. Notificar Líder
        const colaborador = await db.getUserById(evidence.colaboradorId);
        if (colaborador && colaborador.leaderId) {
          await db.createNotification({
            destinatarioId: colaborador.leaderId,
            tipo: 'evidencia_reprovada_info',
            titulo: '❌ Evidência Reprovada',
            mensagem: `Evidência do seu liderado ${evidence.colaboradorNome} para a ação "${evidence.action?.nome}" foi reprovada.`,
            referenciaId: evidence.actionId,
          });
        }

        return { success: true };
      }),
  }),

  // ============= IMPORTAÇÃO DE AÇÕES =============
  importActions: importActionsRouter,
});

export type AppRouter = typeof appRouter;
