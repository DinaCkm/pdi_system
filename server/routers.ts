import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure, router } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { authRouter } from "./authRouters";
import { importActionsRouter } from "./importActions";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,

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
        // Verificar se CPF já existe
        const existingUser = await db.getUserByCpf(input.cpf);
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
          openId: `local_${input.cpf}`,
          name: input.name,
          email: input.email,
          cpf: input.cpf,
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

    createBloco: adminProcedure
      .input(z.object({
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createBloco(input);
        return { success: true };
      }),

    updateBloco: adminProcedure
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

    deleteBloco: adminProcedure
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

    createMacro: adminProcedure
      .input(z.object({
        blocoId: z.number(),
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createMacro(input);
        return { success: true };
      }),

    updateMacro: adminProcedure
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

    deleteMacro: adminProcedure
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

    getMicroById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMicroById(input.id);
      }),

    createMicro: adminProcedure
      .input(z.object({
        macroId: z.number(),
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createMicro(input);
        return { success: true };
      }),

    updateMicro: adminProcedure
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

    deleteMicro: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteMicro(input.id);
        return { success: true };
      }),

    // IMPORTAÇÃO EM MASSA
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
          createdBy: ctx.user!.id,
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
  actions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const user = ctx.user!;
      
      if (user.role === "admin") {
        // Admin vê todas as ações
        return await db.getAllActions();
      } else if (user.role === "lider") {
        // Líder vê ações de seus subordinados + suas próprias ações
        const subordinados = await db.getSubordinates(user.id);
        const subordinadosIds = subordinados.map(s => s.id);
        const allActions = await db.getAllActions();
        return allActions.filter(a => 
          a.pdi?.colaboradorId === user.id || 
          subordinadosIds.includes(a.pdi?.colaboradorId || 0)
        );
      } else {
        // Colaborador vê apenas suas próprias ações
        return await db.getActionsByColaboradorId(user.id);
      }
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getActionById(input.id);
      }),

    getByPDI: protectedProcedure
      .input(z.object({ pdiId: z.number() }))
      .query(async ({ input }) => {
        return await db.getActionsByPDIId(input.pdiId);
      }),

    myActions: protectedProcedure.query(async ({ ctx }) => {
      return await db.getActionsByColaboradorId(ctx.user!.id);
    }),

    pendingApproval: adminOrLeaderProcedure.query(async ({ ctx }) => {
      if (ctx.user!.role === "admin") {
        // Admin vê todas as ações pendentes
        const allActions = await db.getAllActions();
        return allActions.filter(a => a.status === "pendente_aprovacao_lider");
      } else {
        // Líder vê apenas ações de seus colaboradores
        return await db.getPendingActionsForLeader(ctx.user!.id);
      }
    }),

    create: adminProcedure
      .input(z.object({
        pdiId: z.number(),
        blocoId: z.number(),
        macroId: z.number(),
        microId: z.number(),
        nome: z.string().min(1, "Nome é obrigatório"),
        descricao: z.string().min(1, "Descrição é obrigatória"),
        prazo: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const prazoDate = new Date(input.prazo);
        
        // Buscar PDI para validar ciclo
        const pdi = await db.getPDIById(input.pdiId);
        if (!pdi) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI não encontrado' });
        }
        
        // Buscar ciclo para validar prazo
        const ciclo = await db.getCicloById(pdi.cicloId);
        if (!ciclo) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ciclo não encontrado' });
        }
        
        // Validar se prazo está dentro do ciclo
        if (prazoDate < ciclo.dataInicio || prazoDate > ciclo.dataFim) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: `Prazo deve estar entre ${ciclo.dataInicio.toLocaleDateString()} e ${ciclo.dataFim.toLocaleDateString()}` 
          });
        }
        
        const actionResult = await db.createAction({
          pdiId: input.pdiId,
          blocoId: input.blocoId,
          macroId: input.macroId,
          microId: input.microId,
          nome: input.nome,
          descricao: input.descricao,
          prazo: prazoDate,
          createdBy: ctx.user!.id,
        });
        
        // Notificar líder
        const colaborador = await db.getUserById(pdi.colaboradorId);
        if (colaborador?.leaderId) {
          await db.createNotification({
            destinatarioId: colaborador.leaderId,
            tipo: "nova_acao",
            titulo: "Nova ação criada",
            mensagem: `Nova ação criada para ${colaborador.name}: ${input.nome}`,
            referenciaId: actionResult.insertId,
          });
        }
        
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        descricao: z.string().optional(),
        blocoId: z.number().optional(),
        macroId: z.number().optional(),
        microId: z.number().optional(),
        prazo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, prazo, ...rest } = input;
        
        const updateData: any = { ...rest };
        if (prazo) {
          updateData.prazo = new Date(prazo);
        }
        
        await db.updateAction(id, updateData);
        return { success: true };
      }),

    approve: adminOrLeaderProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const action = await db.getActionById(input.id);
        if (!action) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }
        
        if (action.status !== "pendente_aprovacao_lider") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ação não está pendente de aprovação' });
        }
        
        // Buscar PDI e dono (pode ser colaborador ou líder)
        const pdi = await db.getPDIById(action.pdiId);
        if (!pdi) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI não encontrado' });
        }
        
        const donoPDI = await db.getUserById(pdi.colaboradorId);
        if (!donoPDI) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Usuário não encontrado' });
        }
        
        // Validar hierarquia: apenas admin ou líder direto pode aprovar
        if (ctx.user!.role !== 'admin' && donoPDI.leaderId !== ctx.user!.id) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Apenas o líder direto ou admin pode aprovar esta ação' 
          });
        }
        
        await db.updateAction(input.id, { 
          status: "aprovada_lider",
        });
        
        // Notificar dono do PDI
        await db.createNotification({
          destinatarioId: pdi.colaboradorId,
          tipo: "acao_aprovada",
          titulo: "Ação aprovada",
          mensagem: `Sua ação "${action.nome}" foi aprovada`,
        });
        
        return { success: true };
      }),

    reject: adminOrLeaderProcedure
      .input(z.object({ 
        id: z.number(),
        justificativa: z.string().min(1, "Justificativa é obrigatória"),
      }))
      .mutation(async ({ input }) => {
        const action = await db.getActionById(input.id);
        if (!action) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }
        
        if (action.status !== "pendente_aprovacao_lider") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ação não está pendente de aprovação' });
        }
        
        await db.updateAction(input.id, { 
          status: "reprovada_lider",
          justificativaReprovacaoLider: input.justificativa,
        });
        
        // Notificar admin
        const pdi = await db.getPDIById(action.pdiId);
        if (pdi) {
          const admin = await db.getUserById(action.createdBy);
          if (admin) {
            await db.createNotification({
              destinatarioId: admin.id,
              tipo: "acao_reprovada",
              titulo: "Ação reprovada",
              mensagem: `Ação "${action.nome}" foi reprovada. Justificativa: ${input.justificativa}`,
            });
          }
        }
        
        return { success: true };
      }),

    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const action = await db.getActionById(input.id);
        if (!action) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }
        
        if (action.status !== "aprovada_lider") {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Ação precisa estar aprovada pelo líder' });
        }
        
        await db.updateAction(input.id, { status: "em_andamento" });
        return { success: true };
      }),

    // ============= SOLICITAÇÃO DE AJUSTE =============
    
    teamAdjustmentRequests: protectedProcedure.query(async ({ ctx }) => {
      // Retorna solicitações de ajuste pendentes dos subordinados do líder
      return await db.getPendingAdjustmentRequestsByLeaderId(ctx.user!.id);
    }),
    
    solicitarAjuste: protectedProcedure
      .input(z.object({
        actionId: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter pelo menos 10 caracteres"),
        camposAjustar: z.object({
          nome: z.string().optional(),
          descricao: z.string().optional(),
          prazo: z.string().optional(), // ISO date string
          blocoId: z.number().optional(),
          macroId: z.number().optional(),
          microId: z.number().optional(),
        }),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Verificar se a ação existe e pertence ao colaborador
        const acao = await db.getActionById(input.actionId);
        if (!acao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }

        const pdi = await db.getPDIById(acao.pdiId);
        if (!pdi) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'PDI não encontrado' });
        }

        if (pdi.colaboradorId !== ctx.user!.id) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'Você não tem permissão para solicitar ajuste nesta ação' });
        }

        // 2. Colaborador pode solicitar ajuste em ações com qualquer status

        // 3. VALIDAÇÃO: Verificar se já existe solicitação pendente
        const solicitacoesPendentes = await db.getPendingAdjustmentRequestsByAction(input.actionId);
        if (solicitacoesPendentes.length > 0) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Já existe uma solicitação de ajuste pendente para esta ação. Aguarde a avaliação do Admin antes de solicitar um novo ajuste.' 
          });
        }

        // 4. VALIDAÇÃO: Verificar limite total de solicitações (máximo 5)
        const totalSolicitacoes = await db.countAdjustmentRequestsByAction(input.actionId);
        if (totalSolicitacoes >= 5) {
          throw new TRPCError({ 
            code: 'BAD_REQUEST', 
            message: 'Limite de 5 solicitações de ajuste atingido para esta ação. Não é possível solicitar mais ajustes.' 
          });
        }

        // 5. Criar solicitação de ajuste
        const solicitacao = await db.createAdjustmentRequest({
          actionId: input.actionId,
          solicitanteId: ctx.user!.id,
          tipoSolicitante: 'colaborador',
          justificativa: input.justificativa,
          camposAjustar: JSON.stringify(input.camposAjustar),
          status: 'pendente',
        });

        // 6. Atualizar status da ação para "em_discussao"
        await db.updateAction(input.actionId, { status: 'em_discussao' });

        // 7. Registrar no histórico
        await db.createAcaoHistorico({
          actionId: input.actionId,
          campo: 'status',
          valorAnterior: acao.status,
          valorNovo: 'em_discussao',
          motivoAlteracao: `Colaborador solicitou ajuste: ${input.justificativa}`,
          alteradoPor: ctx.user!.id,
          solicitacaoAjusteId: solicitacao.id,
        });

        // 8. Notificar Admin
        await db.createNotification({
          destinatarioId: acao.createdBy,
          tipo: 'solicitacao_ajuste',
          titulo: '🔄 Solicitação de Ajuste de Ação',
          mensagem: `${ctx.user!.name} solicitou ajuste na ação "${acao.nome}". Justificativa: ${input.justificativa}`,
          referenciaId: input.actionId,
        });

        // 9. Notificar Líder (informativo)
        const colaborador = await db.getUserById(pdi.colaboradorId);
        if (colaborador && colaborador.leaderId) {
          await db.createNotification({
            destinatarioId: colaborador.leaderId,
            tipo: 'solicitacao_ajuste_info',
            titulo: 'ℹ️ Solicitação de Ajuste (Informativo)',
            mensagem: `Seu liderado ${ctx.user!.name} solicitou ajuste na ação "${acao.nome}".`,
            referenciaId: input.actionId,
          });
        }

        return { success: true, solicitacaoId: solicitacao.id };
      }),

    aprovarAjuste: adminProcedure
      .input(z.object({
        solicitacaoId: z.number(),
        novoNome: z.string().optional(),
        novaDescricao: z.string().optional(),
        novoPrazo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Buscar solicitação
        const solicitacao = await db.getAdjustmentRequestById(input.solicitacaoId);
        if (!solicitacao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        }

        if (solicitacao.status !== 'pendente') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação já foi avaliada' });
        }

        // 2. Buscar ação
        const acao = await db.getActionById(solicitacao.actionId);
        if (!acao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }

        const camposAjustar = JSON.parse(solicitacao.camposAjustar);

        // 3. Usar campos editados pelo admin ou os campos propostos
        const updates: any = {};
        
        // Nome
        const novoNome = input.novoNome || camposAjustar.nome;
        if (novoNome) {
          await db.createAcaoHistorico({
            actionId: acao.id,
            campo: 'nome',
            valorAnterior: acao.nome,
            valorNovo: novoNome,
            motivoAlteracao: input.novoNome ? `Ajuste aprovado e editado pelo admin. Justificativa: ${solicitacao.justificativa}` : `Ajuste aprovado. Justificativa: ${solicitacao.justificativa}`,
            alteradoPor: ctx.user!.id,
            solicitacaoAjusteId: solicitacao.id,
          });
          updates.nome = novoNome;
        }

        // Descrição
        const novaDescricao = input.novaDescricao || camposAjustar.descricao;
        if (novaDescricao) {
          await db.createAcaoHistorico({
            actionId: acao.id,
            campo: 'descricao',
            valorAnterior: acao.descricao,
            valorNovo: novaDescricao,
            motivoAlteracao: input.novaDescricao ? `Ajuste aprovado e editado pelo admin. Justificativa: ${solicitacao.justificativa}` : `Ajuste aprovado. Justificativa: ${solicitacao.justificativa}`,
            alteradoPor: ctx.user!.id,
            solicitacaoAjusteId: solicitacao.id,
          });
          updates.descricao = novaDescricao;
        }

        // Prazo
        const novoPrazo = input.novoPrazo || camposAjustar.prazo;
        if (novoPrazo) {
          await db.createAcaoHistorico({
            actionId: acao.id,
            campo: 'prazo',
            valorAnterior: acao.prazo.toISOString(),
            valorNovo: novoPrazo,
            motivoAlteracao: input.novoPrazo ? `Ajuste aprovado e editado pelo admin. Justificativa: ${solicitacao.justificativa}` : `Ajuste aprovado. Justificativa: ${solicitacao.justificativa}`,
            alteradoPor: ctx.user!.id,
            solicitacaoAjusteId: solicitacao.id,
          });
          updates.prazo = new Date(novoPrazo);
        }

        if (camposAjustar.blocoId) {
          updates.blocoId = camposAjustar.blocoId;
        }

        if (camposAjustar.macroId) {
          updates.macroId = camposAjustar.macroId;
        }

        if (camposAjustar.microId) {
          updates.microId = camposAjustar.microId;
        }

        // Aplicar updates
        if (Object.keys(updates).length > 0) {
          await db.updateAction(acao.id, updates);
        }

        // 4. Atualizar status da ação para "aprovada_lider"
        await db.updateAction(acao.id, { status: 'aprovada_lider' });
        await db.createAcaoHistorico({
          actionId: acao.id,
          campo: 'status',
          valorAnterior: 'em_discussao',
          valorNovo: 'aprovada_lider',
          motivoAlteracao: 'Ajuste aprovado pelo Admin',
          alteradoPor: ctx.user!.id,
          solicitacaoAjusteId: solicitacao.id,
        });

        // 5. Atualizar solicitação
        await db.updateAdjustmentRequest(solicitacao.id, {
          status: 'aprovada',
          evaluatedAt: new Date(),
          evaluatedBy: ctx.user!.id,
        });

        // 6. Notificar Colaborador
        await db.createNotification({
          destinatarioId: solicitacao.solicitanteId,
          tipo: 'ajuste_aprovado',
          titulo: '✅ Ajuste Aprovado',
          mensagem: `Seu ajuste na ação "${acao.nome}" foi aprovado pelo Admin.`,
          referenciaId: acao.id,
        });

        // 7. Notificar Líder com detalhes
        const pdi = await db.getPDIById(acao.pdiId);
        if (pdi) {
          const colaborador = await db.getUserById(pdi.colaboradorId);
          if (colaborador && colaborador.leaderId) {
            await db.createNotification({
              destinatarioId: colaborador.leaderId,
              tipo: 'ajuste_aprovado_info',
              titulo: '✅ Ajuste Aprovado',
              mensagem: `Ajuste na ação "${acao.nome}" do seu liderado ${colaborador.name} foi aprovado pelo Admin.\n\nCampos alterados: ${Object.keys(camposAjustar).join(', ')}`,
              referenciaId: acao.id,
            });
          }
        }

        return { success: true };
      }),

    reprovarAjuste: adminProcedure
      .input(z.object({
        solicitacaoId: z.number(),
        justificativa: z.string().min(10, "Justificativa deve ter pelo menos 10 caracteres"),
      }))
      .mutation(async ({ ctx, input }) => {
        // 1. Buscar solicitação
        const solicitacao = await db.getAdjustmentRequestById(input.solicitacaoId);
        if (!solicitacao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        }

        if (solicitacao.status !== 'pendente') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Solicitação já foi avaliada' });
        }

        // 2. Buscar ação
        const acao = await db.getActionById(solicitacao.actionId);
        if (!acao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Ação não encontrada' });
        }

        // 3. Atualizar status da ação para "em_andamento"
        await db.updateAction(acao.id, { status: 'em_andamento' });
        await db.createAcaoHistorico({
          actionId: acao.id,
          campo: 'status',
          valorAnterior: 'em_discussao',
          valorNovo: 'em_andamento',
          motivoAlteracao: `Ajuste reprovado pelo Admin. Justificativa: ${input.justificativa}`,
          alteradoPor: ctx.user!.id,
          solicitacaoAjusteId: solicitacao.id,
        });

        // 4. Atualizar solicitação
        await db.updateAdjustmentRequest(solicitacao.id, {
          status: 'reprovada',
          justificativaAdmin: input.justificativa,
          evaluatedAt: new Date(),
          evaluatedBy: ctx.user!.id,
        });

        // 5. Notificar Colaborador
        await db.createNotification({
          destinatarioId: solicitacao.solicitanteId,
          tipo: 'ajuste_reprovado',
          titulo: '❌ Ajuste Reprovado',
          mensagem: `Seu ajuste na ação "${acao.nome}" foi reprovado. Justificativa: ${input.justificativa}`,
          referenciaId: acao.id,
        });

        // 6. Notificar Líder com justificativa do admin
        const pdi = await db.getPDIById(acao.pdiId);
        if (pdi) {
          const colaborador = await db.getUserById(pdi.colaboradorId);
          if (colaborador && colaborador.leaderId) {
            await db.createNotification({
              destinatarioId: colaborador.leaderId,
              tipo: 'ajuste_reprovado_info',
              titulo: '❌ Ajuste Reprovado',
              mensagem: `Ajuste na ação "${acao.nome}" do seu liderado ${colaborador.name} foi reprovado pelo Admin.\n\nJustificativa do Admin: ${input.justificativa}`,
              referenciaId: acao.id,
            });
          }
        }

        return { success: true };
      }),

    getHistorico: protectedProcedure
      .input(z.object({ actionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAcaoHistorico(input.actionId);
      }),

    getPendingAdjustments: protectedProcedure.query(async ({ ctx }) => {
      // Líderes e administradores podem ver as solicitações pendentes
      return await db.getPendingAdjustmentRequests();
    }),

    getAdjustmentStats: protectedProcedure
      .input(z.object({ actionId: z.number() }))
      .query(async ({ input }) => {
        const total = await db.countAdjustmentRequestsByAction(input.actionId);
        const pendentes = await db.getPendingAdjustmentRequestsByAction(input.actionId);
        
        return {
          total,
          pendentes: pendentes.length,
          restantes: Math.max(0, 5 - total),
          podeAdicionar: pendentes.length === 0 && total < 5,
          motivoBloqueio: pendentes.length > 0 
            ? 'pending' 
            : total >= 5 
            ? 'limit' 
            : null
        };
      }),

    // ============= COMENTÁRIOS DE SOLICITAÇÕES =============

    addComment: protectedProcedure
      .input(z.object({
        adjustmentRequestId: z.number(),
        comentario: z.string().min(1, "Comentário não pode estar vazio"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verificar se a solicitação existe
        const solicitacao = await db.getAdjustmentRequestById(input.adjustmentRequestId);
        if (!solicitacao) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitação não encontrada' });
        }

        // Criar comentário
        const comment = await db.createAdjustmentComment({
          adjustmentRequestId: input.adjustmentRequestId,
          autorId: ctx.user!.id,
          comentario: input.comentario,
        });

        // Notificar solicitante (se não for ele mesmo comentando)
        if (ctx.user!.id !== solicitacao.solicitanteId) {
          await db.createNotification({
            destinatarioId: solicitacao.solicitanteId,
            tipo: 'novo_comentario_ajuste',
            titulo: '💬 Novo Comentário na Solicitação',
            mensagem: `${ctx.user!.name} comentou na sua solicitação de ajuste.`,
            referenciaId: solicitacao.actionId,
          });
        }

        return comment;
      }),

    getComments: protectedProcedure
      .input(z.object({ adjustmentRequestId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCommentsByAdjustmentRequestId(input.adjustmentRequestId);
      }),

    getPendingAdjustmentsWithDetails: protectedProcedure.query(async ({ ctx }) => {
      // Apenas admins e líderes podem acessar
      if (ctx.user!.role !== 'admin' && ctx.user!.role !== 'lider') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Apenas administradores e líderes podem acessar solicitações pendentes' });
      }
      return await db.getPendingAdjustmentRequestsWithDetails();
    }),

    getAdjustmentRequestById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAdjustmentRequestById(input.id);
      }),

    getPendingAdjustmentsByLeader: protectedProcedure.query(async ({ ctx }) => {
      // Apenas líderes podem acessar
      if (ctx.user!.role !== 'lider' && ctx.user!.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
      }
      return await db.getPendingAdjustmentRequestsByLeaderId(ctx.user!.id);
    }),

    suggestWithAI: protectedProcedure
      .input(z.object({
        blocoId: z.number(),
        macroId: z.number(),
        microId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Buscar informações das competências
        const bloco = await db.getBlocoById(input.blocoId);
        const macro = await db.getMacroById(input.macroId);
        const micro = await db.getMicroById(input.microId);

        if (!bloco || !macro || !micro) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Competência não encontrada' });
        }

        // Chamar LLM para gerar sugestões
        const prompt = `Você é um especialista em desenvolvimento profissional e gestão de competências.

Baseado na seguinte hierarquia de competências:
- Bloco: ${bloco.nome} - ${bloco.descricao || 'Sem descrição'}
- Macrocompetência: ${macro.nome} - ${macro.descricao || 'Sem descrição'}
- Microcompetência: ${micro.nome} - ${micro.descricao || 'Sem descrição'}

Gere uma sugestão de ação de desenvolvimento profissional que ajude o colaborador a desenvolver essa microcompetência.

A sugestão deve incluir:
1. Um nome curto e objetivo para a ação (máximo 80 caracteres)
2. Uma descrição detalhada da ação (2-3 parágrafos) explicando:
   - O que fazer
   - Como fazer
   - Resultados esperados

Formato de resposta (JSON):
{
  "nome": "Nome da ação",
  "descricao": "Descrição detalhada da ação"
}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um especialista em desenvolvimento profissional. Sempre responda em JSON válido." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "action_suggestion",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  nome: { type: "string", description: "Nome curto da ação" },
                  descricao: { type: "string", description: "Descrição detalhada da ação" },
                },
                required: ["nome", "descricao"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        if (!content || typeof content !== 'string') {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Falha ao gerar sugestão' });
        }

        const suggestion = JSON.parse(content);
        return suggestion;
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAction(input.id);
        return { success: true };
      }),
  }),

  // ============= NOTIFICAÇÕES =============
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getNotificationsByUserId(ctx.user!.id);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.markNotificationAsRead(input.id);
        return { success: true };
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationsCount(ctx.user!.id);
    }),
  }),

  // ============= EVIDÊNCIAS =============
  evidences: router({
    create: protectedProcedure
      .input(z.object({
        actionId: z.number(),
        files: z.array(z.object({
          fileName: z.string(),
          fileType: z.string(),
          fileSize: z.number(),
          fileUrl: z.string(),
          fileKey: z.string(),
        })).optional(),
        texts: z.array(z.object({
          titulo: z.string().optional(),
          texto: z.string(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
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
        });

        // 4. Adicionar arquivos
        if (input.files && input.files.length > 0) {
          for (const file of input.files) {
            await db.addEvidenceFile({
              evidenceId,
              ...file,
            });
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
          mensagem: `Sua evidência para a ação "${evidence.action?.nome}" foi aprovada pelo Admin.`,
          referenciaId: evidence.actionId,
        });

        // 6. Notificar Líder
        const colaborador = await db.getUserById(evidence.colaboradorId);
        if (colaborador && colaborador.leaderId) {
          await db.createNotification({
            destinatarioId: colaborador.leaderId,
            tipo: 'evidencia_aprovada_info',
            titulo: '✅ Evidência Aprovada',
            mensagem: `Evidência do seu liderado ${evidence.colaboradorNome} para a ação "${evidence.action?.nome}" foi aprovada.`,
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
          mensagem: `Sua evidência para a ação "${evidence.action?.nome}" foi reprovada. Justificativa: ${input.justificativa}`,
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
