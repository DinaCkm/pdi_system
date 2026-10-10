// Eixos transversais definidos pela CKM/SEBRAE (outubro/2026).
//
// Transversal = conhecimento comum a todo o SEBRAE (ou a todos os gestores).
// Regras:
//  - o eixo transversal é obrigatório na matriz de quem deve tê-lo;
//  - a relação dele é sempre TRANSVERSAL, fixa: a IA não classifica e o
//    empregado não pode pedir alteração (só o administrador altera);
//  - Transversal tem o mesmo peso e a mesma meta (70%) que Essencial e também
//    recebe a calibragem pelo engajamento no PDI;
//  - nos demais eixos a relação TRANSVERSAL deixa de existir: só ESSENCIAL ou
//    NAO_ESSENCIAL.
//
// Gestor = perfil "lider" (todo líder é gestor).

export const EIXOS_TRANSVERSAIS_TODOS = [
  "Comunicação",
  "Ética, Integridade e Responsabilidade",
  "Inovação e Gestão do Conhecimento",
] as const;

export const EIXOS_TRANSVERSAIS_GESTORES = [
  "Estratégia e Planejamento",
  "Liderança e Gestão de Equipes",
] as const;

// Competência comportamental (Avaliação de Desempenho) transversal a todos.
export const COMPETENCIA_COMPORTAMENTAL_TRANSVERSAL = "Atuação Colaborativa";

export type TipoTransversal = "TODOS" | "GESTORES";

export function normalizarNomeEixo(valor: unknown) {
  return String(valor ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ");
}

const TODOS = new Set(EIXOS_TRANSVERSAIS_TODOS.map(normalizarNomeEixo));
const GESTORES = new Set(EIXOS_TRANSVERSAIS_GESTORES.map(normalizarNomeEixo));

export function tipoTransversal(eixoNome: unknown): TipoTransversal | null {
  const chave = normalizarNomeEixo(eixoNome);
  if (TODOS.has(chave)) return "TODOS";
  if (GESTORES.has(chave)) return "GESTORES";
  return null;
}

export function ehGestorPorPerfil(role: unknown) {
  return String(role ?? "").trim().toLowerCase() === "lider";
}

// O eixo é transversal (relação fixa) para esta pessoa?
export function ehTransversalPara(eixoNome: unknown, ehGestor: boolean) {
  const tipo = tipoTransversal(eixoNome);
  if (tipo === "TODOS") return true;
  if (tipo === "GESTORES") return ehGestor;
  return false;
}

// Classificações com meta de 70%, mesmo peso e calibragem pelo PDI.
export function classificacaoComMeta(classificacao: unknown) {
  const valor = String(classificacao ?? "").trim().toUpperCase();
  return valor === "ESSENCIAL" || valor === "TRANSVERSAL";
}

export const TEXTO_TRANSVERSAL_FIXO =
  "Eixo transversal obrigatório, definido pela instituição: conhecimento comum a todo o SEBRAE. A classificação não é feita pelo questionário e não pode ser alterada pelo empregado.";

export const TEXTO_TRANSVERSAL_GESTORES =
  "Eixo transversal obrigatório para gestores, definido pela instituição. A classificação não é feita pelo questionário e não pode ser alterada pelo empregado.";

export function textoTransversalFixo(eixoNome: unknown) {
  return tipoTransversal(eixoNome) === "GESTORES" ? TEXTO_TRANSVERSAL_GESTORES : TEXTO_TRANSVERSAL_FIXO;
}
