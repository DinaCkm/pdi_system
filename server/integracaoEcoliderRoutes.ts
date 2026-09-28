import { Router, type Request, type Response } from "express";
import { assinaturaIntegracaoValida } from "./services/integracaoAssinatura";
import { montarCatalogoCompetencias, type ItemCatalogo } from "./services/catalogoCompetencias";

// APIs que o EcoLíder chama no PDI, sem sessão, assinadas com HMAC
// (segredo compartilhado INTEGRACAO_PDI_ECOLIDER_SECRET).
export const CATALOGO_COMPETENCIAS_PATH = "/api/integracao/ecolider/catalogo-competencias";

export function criarHandlerCatalogo(deps: {
  secret: () => string | undefined;
  montar: () => Promise<ItemCatalogo[]>;
}) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    const secret = deps.secret();
    if (!secret) {
      return res.status(503).json({ error: "Integração com o EcoLíder não configurada." });
    }
    const valida = assinaturaIntegracaoValida({
      secret,
      timestamp: req.get("X-Integracao-Timestamp"),
      assinatura: req.get("X-Integracao-Assinatura"),
      metodo: req.method,
      caminho: req.originalUrl,
    });
    if (!valida) {
      return res.status(401).json({ error: "Assinatura inválida." });
    }
    try {
      return res.json({ itens: await deps.montar() });
    } catch (error) {
      console.error("[IntegracaoEcolider] Erro ao montar catálogo:", error);
      return res.status(500).json({ error: "Erro ao montar o catálogo." });
    }
  };
}

export const integracaoEcoliderRouter = Router();
integracaoEcoliderRouter.get(
  CATALOGO_COMPETENCIAS_PATH,
  criarHandlerCatalogo({ secret: () => process.env.INTEGRACAO_PDI_ECOLIDER_SECRET, montar: montarCatalogoCompetencias })
);
