import "dotenv/config";
// import { importInitialData } from "../importInitialData";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createTRPCContext } from "./customTrpc";
import { serveStatic, setupVite } from "./vite";
import { timingSafeEqual } from "crypto";

async function startServer() {
  const app = express();

  // Executa a importação de dados iniciais antes de iniciar o servidor
  // await importInitialData();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // Cookie parser for custom auth
  app.use(cookieParser());
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext: createTRPCContext,
    })
  );
 // Rota cron para varredura de ações vencidas (quinzenal)
app.post("/api/cron/acoes-vencidas", async (req, res) => {
  try {
    const receivedSecret = req.header("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("[CRON] CRON_SECRET não configurado.");
      return res.status(500).json({ error: "Cron indisponível." });
    }

    if (!receivedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const isValid =
      receivedSecret.length === expectedSecret.length &&
      timingSafeEqual(
        Buffer.from(receivedSecret),
        Buffer.from(expectedSecret)
      );

    if (!isValid) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { appRouter } = await import("../routers");

    const caller = appRouter.createCaller({
      user: {
        id: 0,
        name: "CRON",
        email: "",
        role: "admin",
        cpf: "",
      } as any,
      req: req as any,
      res: res as any,
    });

    const result = await caller.alertaAcoesVencidas.executarVarredura();
    return res.json(result);
  } catch (error: any) {
    console.error("[CRON] Erro na varredura de ações vencidas:", error);
    return res.status(500).json({ error: "Erro interno." });
  }
});

  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

 const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
