import { z } from "zod";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, adminOrLeaderProcedure, router } from "./_core/customTrpc";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { authRouter } from "./authRouters";

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
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDepartamento(id, data);
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

        // Verificar auto-atribuição de líder
        if (input.leaderId) {
          const leader = await db.getUserById(input.leaderId);
          if (!leader) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Líder não encontrado.' 
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
        status: z.enum(["ativo", "inativo"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;

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
});

export type AppRouter = typeof appRouter;
