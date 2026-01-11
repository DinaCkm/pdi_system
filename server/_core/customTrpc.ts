import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { CustomTrpcContext } from "./customContext";

const t = initTRPC.context<CustomTrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware para verificar autenticação
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar autenticado para acessar este recurso",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user é garantido não-null aqui
    },
  });
});

/**
 * Middleware para verificar se é admin
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar autenticado",
    });
  }

  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores podem acessar este recurso",
    });
  }

  return next({ ctx });
});

/**
 * Middleware para verificar se é admin ou líder
 */
const isAdminOrLeader = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Você precisa estar autenticado",
    });
  }

  if (ctx.user.role !== "admin" && ctx.user.role !== "lider") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores e líderes podem acessar este recurso",
    });
  }

  return next({ ctx });
});

export const protectedProcedure = t.procedure.use(isAuthenticated);
export const adminProcedure = t.procedure.use(isAdmin);
export const adminOrLeaderProcedure = t.procedure.use(isAdminOrLeader);
