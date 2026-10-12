import React from "react";
import { CONCEITOS, ROTULO_CONCEITO, type Conceito } from "../../../shared/fimDeCicloRegras";

// Peças visuais comuns ao relatório de fim de ciclo e à Matriz de Conhecimento.

export const C = {
  fundo: "#F3F5F7",
  cartao: "#FFFFFF",
  borda: "#E3E8EE",
  texto: "#0F1B2D",
  secundario: "#5B6778",
  corpo: "#46505E",
  positivo: "#0B6E6E",
  positivoClaro: "#4FB3AB",
  atencao: "#9A6114",
  atencaoClaro: "#D99A3B",
  neutro: "#C3CBD5",
  linhaSuave: "#EEF1F4",
  cinzaClaro: "#F6F8FA",
  sintese: "#0F1B2D",
  sinteseSelo: "#7FD6CF",
  focoFundo: "#FBF1E2",
  focoTexto: "#6B430C",
  transvFundo: "#E3EAF6",
  transvTexto: "#1A3F85",
  tealFundo: "#E3F2F1",
  tealTexto: "#0B3B3B",
};

export const FONTE_TITULO = "'Sora', system-ui, sans-serif";
export const FONTE_TEXTO = "'Source Sans 3', system-ui, sans-serif";

// Régua de conceitos: âmbar para Em Desenvolvimento, teal crescente na expectativa.
export const COR_CONCEITO: Record<Conceito, string> = {
  EM_DESENVOLVIMENTO: "#D99A3B",
  APLICADO: "#A8DCD6",
  CONSOLIDADO: "#4FB3AB",
  AVANCADO: "#1A8C84",
  REFERENCIA: "#0B5E5E",
};
const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "a", "o", "em", "para"]);
export function nomeArea(area: string | null | undefined) {
  if (!area) return "";
  const [sigla, ...resto] = area.split(" - ");
  if (!resto.length) return area;
  const nome = resto
    .join(" - ")
    .toLocaleLowerCase("pt-BR")
    .split(" ")
    .map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1)))
    .join(" ");
  return `${sigla.trim()} · ${nome}`;
}

export function Secao({ titulo, subtitulo, acao, children, id }: { titulo: string; subtitulo?: string; acao?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section
      aria-labelledby={id}
      style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: "clamp(20px, 4vw, 32px)", display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 id={id} style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 22, fontWeight: 600 }}>
            {titulo}
          </h2>
          {subtitulo && <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function Abas<T extends string>({ opcoes, valor, onChange, rotulo }: { opcoes: Array<[T, string]>; valor: T; onChange: (v: T) => void; rotulo: string }) {
  return (
    <div role="tablist" aria-label={rotulo} style={{ display: "inline-flex", flexWrap: "wrap", padding: 4, borderRadius: 12, background: C.linhaSuave, gap: 4, alignSelf: "flex-start" }}>
      {opcoes.map(([v, nome]) => {
        const ativo = v === valor;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={ativo}
            onClick={() => onChange(v)}
            style={{
              fontFamily: "inherit",
              fontSize: 15,
              fontWeight: 600,
              minHeight: 44,
              padding: "0 16px",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              background: ativo ? C.cartao : "transparent",
              color: ativo ? C.texto : C.secundario,
              boxShadow: ativo ? "0 1px 3px rgba(15,27,45,0.12)" : "none",
            }}
          >
            {nome}
          </button>
        );
      })}
    </div>
  );
}

export function LegendaConceitos() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", fontSize: 14, color: C.secundario }}>
      {CONCEITOS.map((c) => (
        <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 12, height: 12, borderRadius: 4, background: COR_CONCEITO[c] }} />
          {ROTULO_CONCEITO[c]}
        </span>
      ))}
    </div>
  );
}

