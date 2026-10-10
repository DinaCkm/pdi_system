import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { ehGestorPorPerfil, ehTransversalPara, tipoTransversal } from "../../shared/eixosTransversais";

type Relacao = "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | null;

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

export async function colaboradorEhGestor(db: any, colaboradorId: number) {
  const linha = rowsOf<any>(await db.execute(sql`SELECT role FROM users WHERE id = ${colaboradorId} LIMIT 1`))[0];
  return ehGestorPorPerfil(linha?.role);
}

export async function gestorDaMatriz(db: any, matrizId: number) {
  const linha = rowsOf<any>(await db.execute(sql`
    SELECT u.role FROM prova_utic_matrizes m JOIN users u ON u.id = m.colaborador_id WHERE m.id = ${matrizId} LIMIT 1
  `))[0];
  return ehGestorPorPerfil(linha?.role);
}

// Mensagem de erro quando a relação desrespeita a regra dos transversais; null quando está correta.
// Relação nula (eixo pendente) é sempre aceita.
export function erroRegraTransversal(eixoNome: string, relacao: Relacao, ehGestor: boolean): string | null {
  if (!relacao) return null;
  if (ehTransversalPara(eixoNome, ehGestor)) {
    return relacao === "TRANSVERSAL"
      ? null
      : `"${eixoNome}" é eixo transversal obrigatório${tipoTransversal(eixoNome) === "GESTORES" ? " para gestores" : ""}: a classificação é sempre Transversal.`;
  }
  if (relacao === "TRANSVERSAL") {
    return `"${eixoNome}" não é eixo transversal. Classifique como Essencial ou Não essencial. Transversais: Comunicação; Ética, Integridade e Responsabilidade; Inovação e Gestão do Conhecimento; e, para gestores, Estratégia e Planejamento e Liderança e Gestão de Equipes.`;
  }
  return null;
}

export function exigirRegraTransversal(eixoNome: string, relacao: Relacao, ehGestor: boolean) {
  const erro = erroRegraTransversal(eixoNome, relacao, ehGestor);
  if (erro) throw new TRPCError({ code: "BAD_REQUEST", message: erro });
}
