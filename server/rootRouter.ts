import { appRouter } from "./routers";
import { avaliacoesRouter } from "./routers/avaliacoes";
import { mergeRouters, router } from "./_core/customTrpc";

const avaliacoesRootRouter = router({
  avaliacoes: avaliacoesRouter,
});

export const rootRouter = mergeRouters(appRouter, avaliacoesRootRouter);

export type RootRouter = typeof rootRouter;
