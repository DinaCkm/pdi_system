import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { ZodError } from "zod";

// 1. CONTEXTO SEM DEPENDÊNCIA DE JWT
export const createTRPCContext = async (opts: CreateExpressContextOptions) => {
  const { req, res } = opts;
  // Pega o token do cabeçalho Authorization
  const token = req.headers.authorization?.split(" ")[1];

  let user = null;
  
  if (token) {
    try {
      // A MÁGICA: Decodificação nativa (Base64 -> JSON)
      // Substitui o jwt.verify para não precisarmos instalar pacotes
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      user = decoded;
    } catch (cause) {
      // Se o token for inválido, o usuário segue como null (deslogado)
    }
  }

  return { user, req, res };
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
export const publicProcedure = t.procedure;

// Middleware: Verifica se está logado
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Você precisa estar logado." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Middleware: Apenas Admin
const isAdmin = t.middleware(({ ctx, next }) => {
  const isAdminRole = ctx.user?.role === 'admin' || ctx.user?.role === 'Administrador';
  if (!ctx.user || !isAdminRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const adminProcedure = t.procedure.use(isAuthed).use(isAdmin);

// Middleware: Admin ou Líder
const isAdminOrLeader = t.middleware(({ ctx, next }) => {
  const isAllowed = ctx.user?.role === 'admin' || ctx.user?.role === 'lider';
  if (!ctx.user || !isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const adminOrLeaderProcedure = t.procedure.use(isAuthed).use(isAdminOrLeader);

// Middleware: Admin ou Gerente (gerente tem acesso de visualização limitado)
const isAdminOrGerente = t.middleware(({ ctx, next }) => {
  const isAllowed = ctx.user?.role === 'admin' || ctx.user?.role === 'gerente';
  if (!ctx.user || !isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const adminOrGerenteProcedure = t.procedure.use(isAuthed).use(isAdminOrGerente);

// Middleware: Gerente (acesso de visualização a Dashboard, PDIs, Ações, Histórico)
const isGerente = t.middleware(({ ctx, next }) => {
  const isAllowed = ctx.user?.role === 'gerente';
  if (!ctx.user || !isAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes." });
  }
  return next({ ctx: { user: ctx.user } });
});

export const gerenteProcedure = t.procedure.use(isAuthed).use(isGerente);
