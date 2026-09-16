import { appRouter } from "./routers";
import { avaliacoesRouter } from "./routers/avaliacoes";
import { provaUticRouter } from "./routers/provaUtic";
import { provaUticTesteRouter } from "./routers/provaUticTeste";
import { provaUticResultadosRouter } from "./routers/provaUticResultados";
import { provaUticAuditoriaRouter } from "./routers/provaUticAuditoria";
import { provaUticMatrizRouter } from "./routers/provaUticMatriz";
import { importacaoProvasRouter } from "./routers/importacaoProvas";
import { aplicacoesProficienciaRouter } from "./routers/aplicacoesProficiencia";
import { evolucaoProficienciaRouter } from "./routers/evolucaoProficiencia";
import { mergeRouters, router } from "./_core/customTrpc";

const avaliacoesRootRouter = router({
  avaliacoes: avaliacoesRouter,
  provaUtic: provaUticRouter,
  provaUticTeste: provaUticTesteRouter,
  provaUticResultados: provaUticResultadosRouter,
  provaUticAuditoria: provaUticAuditoriaRouter,
  provaUticMatriz: provaUticMatrizRouter,
  importacaoProvas: importacaoProvasRouter,
  aplicacoesProficiencia: aplicacoesProficienciaRouter,
  evolucaoProficiencia: evolucaoProficienciaRouter,
});

export const rootRouter = mergeRouters(appRouter, avaliacoesRootRouter);

export type RootRouter = typeof rootRouter;
