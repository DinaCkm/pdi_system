// Códigos estáveis das competências de origem das ações do PDI, usados no vínculo com
// o EcoLíder. Derivam de nomes fixos no código (referência metodológica e matriz técnica).
import { separarFoco } from "./focosCompetencias";

export function slugCompetencia(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const NIVEL_CODIGO: Record<string, string> = {
  "Básica": "BASICA",
  "Essencial": "ESSENCIAL",
  "Master": "MASTER",
  "Jornada do Futuro": "JORNADA",
};

// COMP:<competência AD>:<nível>:<foco>, ex.: COMP:FOCO_NO_CLIENTE:BASICA:ATENCAO
export function codigoFocoComportamental(competenciaAD: string, focoBem: string) {
  const foco = separarFoco(focoBem);
  if (!foco?.nivel) return null;
  return `COMP:${slugCompetencia(competenciaAD)}:${NIVEL_CODIGO[foco.nivel]}:${slugCompetencia(foco.nome)}`;
}

// TEC:<eixo_id da matriz técnica>
export function codigoEixoTecnico(eixoId: string) {
  const id = String(eixoId ?? "").trim();
  return id ? `TEC:${id.toUpperCase()}` : null;
}
