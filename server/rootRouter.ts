import { appRouter } from "./routers";
import { avaliacoesRouter } from "./routers/avaliacoes";
import { provaUticRouter } from "./routers/provaUtic";
import { provaUticTesteRouter } from "./routers/provaUticTeste";
import { provaUticResultadosRouter } from "./routers/provaUticResultados";
import { mergeRouters, router } from "./_core/customTrpc";

const avaliacoesRootRouter = router({
  avaliacoes: avaliacoesRouter,
  provaUtic: provaUticRouter,
  provaUticTeste: provaUticTesteRouter,
  provaUticResultados: provaUticResultadosRouter,
});

export const rootRouter = mergeRouters(appRouter, avaliacoesRootRouter);

export type RootRouter = typeof rootRouter;
