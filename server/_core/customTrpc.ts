import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { ZodError } from "zod";
import { verifyAuthToken } from "./authToken";
import { IMPERSONACAO_COOKIE, verificarTokenImpersonacao } from "./impersonacao";
import * as db from "../db";
import { PDI_LOCK_DEFAULT_MESSAGE } from "@shared/const";

// 1. CONTEXTO COM VALIDAÇÃO DE TOKEN ASSINADO + VERSÃO DE SESSÃO
export const createTRPCContext = async (opts: CreateExpressContextOptions) => {
  const { req, res } = opts;
  const authHeaderToken = req.headers.authorization?.split(" ")[1];
  const cookieToken = req.cookies?.auth_token;
  const token = cookieToken || authHeaderToken;

  let user = null;

  if (token) {
    const tokenUser = await verifyAuthToken(token);

    if (tokenUser) {
      const currentUser = await db.getUserById(tokenUser.id);

      if (
        currentUser &&
        currentUser.status === "ativo" &&
        (currentUser.authTokenVersion ?? 0) === tokenUser.authTokenVersion
      ) {
        user = {
          id: tokenUser.id,
          role: tokenUser.role,
          name: tokenUser.name,
          email: tokenUser.email,
          departmentId: tokenUser.departmentId,
        };
      }
    }
  }

  // "Acessar como": somente um admin logado pode ativar; o alvo não pode ser admin.
  let impersonadoPor: { id: number; name: string; expiraEm: number } | null = null;
  const tokenImpersonacao = req.cookies?.[IMPERSONACAO_COOKIE];
  if (user && (user.role === "admin" || user.role === "Administrador") && tokenImpersonacao) {
    const imp = await verificarTokenImpersonacao(tokenImpersonacao);
    if (imp && imp.adminId === user.id) {
      const alvo = await db.getUserById(imp.alvoId);
      if (alvo && alvo.status === "ativo" && alvo.role !== "admin") {
        impersonadoPor = { id: user.id, name: user.name, expiraEm: imp.expiraEm };
        user = {
          id: alvo.id,
          role: alvo.role,
          name: alvo.name ?? "",
          email: alvo.email ?? "",
          departmentId: alvo.departamentoId ?? null,
        };
      }
    }
  }

  return { user, req, res, impersonadoPor };
};

// 2. INICIALIZAÇÃO DO TRPC
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// 3. DEFINIÇÃO DE ROTAS E PROCEDIMENTOS
export const router = t.router;
export const mergeRouters = t.mergeRouters;
// Enquanto o admin estiver em "Acessar como", o servidor recusa qualquer gravação.
const MUTATIONS_PERMITIDAS_IMPERSONACAO = new Set<string>(["auth.pararAcessoComo", "auth.logout"]);
const bloquearEscritaImpersonacao = t.middleware(({ ctx, type, path, next }) => {
  if (type === "mutation" && ctx.impersonadoPor && !MUTATIONS_PERMITIDAS_IMPERSONACAO.has(path)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Modo \"Acessar como\" é somente leitura. Nenhuma alteração foi gravada.",
    });
  }
  return next();
});
const baseProcedure = t.procedure.use(bloquearEscritaImpersonacao);

export const publicProcedure = baseProcedure;

// Middleware: Verifica se está logado
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Você precisa estar logado." });
  }
  return next({ ctx: { user: ctx.user } });
});

// Procedure autenticada sem o bloqueio do ciclo do PDI.
// Avaliações possuem regras próprias de tentativa, tempo e bloqueio.
export const assessmentProcedure = baseProcedure.use(isAuthed);

// Papéis isentos do bloqueio de execução (mantêm acesso total para administrar o ciclo)
const EXECUTION_LOCK_EXEMPT_ROLES = new Set<string>(["admin", "Administrador", "gerente"]);

// Mutations sempre permitidas, mesmo com o sistema encerrado (auto-atendimento essencial)
const EXECUTION_LOCK_ALLOWLIST = new Set<string>([
  "auth.logout",
  "auth.changePassword",
]);

// Middleware: quando o período de execução do PDI está encerrado, líderes e colaboradores
// ficam em modo somente-leitura — nenhuma escrita (enviar documento / solicitar alteração) é permitida.
const enforceExecutionLock = t.middleware(async ({ ctx, type, path, next }) => {
  if (
    type === "mutation" &&
    ctx.user &&
    !EXECUTION_LOCK_EXEMPT_ROLES.has(ctx.user.role) &&
    !EXECUTION_LOCK_ALLOWLIST.has(path)
  ) {
    const locked = await db.isPdiExecutionLocked();
    if (locked) {
      const settings = await db.getSystemSettings();
      throw new TRPCError({
        code: "FORBIDDEN",
        message: settings.lockMessage || PDI_LOCK_DEFAULT_MESSAGE,
      });
    }
  }
  return next();
});

export const protectedProcedure = baseProcedure.use(isAuthed).use(enforceExecutionLock);

// Middleware: Apenas Admin
const isAdmin = t.middleware(({ ctx, next }) => {
  const isAdminRole = ctx.user?.role === "admin" || ctx.user?.role === "Administrador";
  if (!ctx.user || !isAdminRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const adminProcedure = baseProcedure.use(isAuthed).use(isAdmin);

// Middleware: Admin ou Líder
const isAdminOrLeader = t.middleware(({ ctx, next }) => {
  const isAllowed = ctx.user?.role === "admin" || ctx.user?.role === "lider";
  if (!ctx.user || !isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const adminOrLeaderProcedure = baseProcedure.use(isAuthed).use(isAdminOrLeader).use(enforceExecutionLock);

// Middleware: Admin ou Gerente
const isAdminOrGerente = t.middleware(({ ctx, next }) => {
  const isAllowed = ctx.user?.role === "admin" || ctx.user?.role === "gerente";
  if (!ctx.user || !isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const adminOrGerenteProcedure = baseProcedure.use(isAuthed).use(isAdminOrGerente);

// Middleware: Gerente
const isGerente = t.middleware(({ ctx, next }) => {
  const isAllowed = ctx.user?.role === "gerente";
  if (!ctx.user || !isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const gerenteProcedure = baseProcedure.use(isAuthed).use(isGerente);
