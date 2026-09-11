import { appRouter } from "./routers";
import { avaliacoesRouter } from "./routers/avaliacoes";
import { provaUticRouter } from "./routers/provaUtic";
import { provaUticTesteRouter } from "./routers/provaUticTeste";
import { mergeRouters, router } from "./_core/customTrpc";

const avaliacoesRootRouter = router({
  avaliacoes: avaliacoesRouter,
  provaUtic: provaUticRouter,
  provaUticTeste: provaUticTesteRouter,
});

export const rootRouter = mergeRouters(appRouter, avaliacoesRootRouter);

export type RootRouter = typeof rootRouter;
