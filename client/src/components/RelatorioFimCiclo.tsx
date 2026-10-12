import React, { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CONCEITOS, ROTULO_CONCEITO, type Conceito } from "../../../shared/fimDeCicloRegras";
import { Abas, C, COR_CONCEITO, FONTE_TEXTO, FONTE_TITULO, LegendaConceitos, Secao, nomeArea } from "./fimCicloEstilo";
import { MatrizPorArea } from "./MatrizConhecimento";

// Relatório de Fim de Ciclo do PDI — página da diretoria.
// Segue a "Especificação de ajustes — Relatório de Fim de Ciclo do PDI" e o
// protótipo visual "Página da diretoria", na língua do sistema: CONCEITOS.
// Nenhuma nota, média ou percentual; só contagens. Nenhum nome de pessoa.

const api = (trpc as any).evolucaoCiclo;

const COR_GRUPO: Record<string, string> = {
  MANTEVE: C.positivo,
  CHEGOU: C.positivoClaro,
  ABAIXO: C.atencaoClaro,
  SEM_COMPARACAO: C.neutro,
};
const ROTULO_GRUPO: Record<string, string> = {
  MANTEVE: "Já na expectativa e manteve",
  CHEGOU: "Chegou à expectativa neste ciclo",
  ABAIXO: "Em Desenvolvimento",
  SEM_COMPARACAO: "Sem comparação",
};

const GRUPOS = ["MANTEVE", "CHEGOU", "ABAIXO", "SEM_COMPARACAO"] as const;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function mesAno(iso: string | null | undefined) {
  if (!iso) return "[a carregar]";
  const [a, m] = iso.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
}

// ---------- Peças visuais ----------

function Sintese({ texto }: { texto: string }) {
  if (!texto) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-start", padding: "20px 22px", borderRadius: 14, background: C.sintese, color: C.fundo }}>
      <span
        style={{ flex: "none", padding: "4px 10px", borderRadius: 999, background: "rgba(127,214,207,0.16)", color: C.sinteseSelo, fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
      >
        Síntese
      </span>
      <p style={{ flex: "1 1 320px", margin: 0, fontSize: 16, lineHeight: 1.6 }}>{texto}</p>
    </div>
  );
}

function Chip({ children, tipo = "neutro" }: { children: React.ReactNode; tipo?: "neutro" | "foco" | "transversal" | "vazio" }) {
  const estilos = {
    neutro: { background: C.cinzaClaro, color: C.texto, fontWeight: 400 },
    foco: { background: C.focoFundo, color: C.focoTexto, fontWeight: 600 },
    transversal: { background: C.transvFundo, color: C.transvTexto, fontWeight: 600 },
    vazio: { background: C.cinzaClaro, color: C.corpo, fontWeight: 400 },
  }[tipo];
  return <span style={{ padding: "6px 12px", borderRadius: 999, fontSize: 14, ...estilos }}>{children}</span>;
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span style={{ padding: "2px 8px", borderRadius: 999, background: C.linhaSuave, color: C.corpo, fontWeight: 600, fontSize: 12 }}>{children}</span>;
}

function Quadro({ rotulo, valor, detalhe }: { rotulo: string; valor: React.ReactNode; detalhe: React.ReactNode }) {
  return (
    <div style={{ padding: 18, borderRadius: 14, background: C.cinzaClaro, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: C.secundario }}>{rotulo}</div>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 24, fontWeight: 700 }}>{valor}</div>
      <div style={{ fontSize: 14, color: C.corpo }}>{detalhe}</div>
    </div>
  );
}

function Grade({ min = 280, gap = 16, children }: { min?: number; gap?: number; children: React.ReactNode }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))`, gap }}>{children}</div>;
}

// Barra com a distribuição de pessoas pelos cinco conceitos.
function Distribuicao({ dist, rotulo, altura = 14 }: { dist: Record<Conceito, number>; rotulo: string; altura?: number }) {
  const total = CONCEITOS.reduce((t, c) => t + (dist?.[c] ?? 0), 0);
  const aria = `${rotulo}: ${CONCEITOS.filter((c) => dist?.[c]).map((c) => `${dist[c]} em ${ROTULO_CONCEITO[c]}`).join(", ") || "sem pessoas"}`;
  return (
    <div role="img" aria-label={aria} style={{ display: "flex", height: altura, borderRadius: 999, overflow: "hidden", gap: 2, background: "#EEF1F4", minWidth: 0 }}>
      {total > 0 &&
        CONCEITOS.map((c) => (dist[c] ? <div key={c} title={`${ROTULO_CONCEITO[c]}: ${dist[c]}`} style={{ width: `${(dist[c] / total) * 100}%`, background: COR_CONCEITO[c] }} /> : null))}
    </div>
  );
}

const cont = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

function Barra({ titulo, grupos, total }: { titulo: string; grupos: Record<string, number>; total: number }) {
  const aria = `${titulo}: ${GRUPOS.map((g) => `${grupos[g] ?? 0} ${ROTULO_GRUPO[g].toLowerCase()}`).join(", ")}`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15 }}>
        <strong>{titulo}</strong>
        <span style={{ color: C.secundario }}>{total} avaliações</span>
      </div>
      <div style={{ display: "flex", height: 20, borderRadius: 999, overflow: "hidden", gap: 3, background: C.linhaSuave }} role="img" aria-label={aria}>
        {GRUPOS.map((g) =>
          grupos[g] ? <div key={g} style={{ width: `${(grupos[g] / Math.max(total, 1)) * 100}%`, background: COR_GRUPO[g] }} /> : null,
        )}
      </div>
    </div>
  );
}

const ACARREGAR = "[a carregar]";

// Eixos técnicos em três grupos, nunca misturados.
const GRUPOS_EIXO = [
  { chave: "T", titulo: "Eixos transversais", alcance: "comuns a todo o Sebrae", sub: "Comuns a todo o Sebrae: todas as pessoas são avaliadas neles.", tipoChip: "transversal" as const, filtro: (e: any) => e.transversal && !e.lideranca },
  { chave: "L", titulo: "Eixos de liderança", alcance: "comuns a todos os líderes", sub: "Transversais dos líderes: só os líderes são avaliados neles.", tipoChip: "transversal" as const, filtro: (e: any) => !!e.lideranca },
  { chave: "E", titulo: "Eixos essenciais", alcance: "específicos de cada área", sub: "Específicos de cada área: só as pessoas das funções em que o eixo é essencial são avaliadas.", tipoChip: "neutro" as const, filtro: (e: any) => !e.transversal },
];
const ROTULO_PUBLICO = { TODOS: "Todos", LIDERES: "Líderes", DEMAIS: "Demais empregados" } as const;
type Publico = keyof typeof ROTULO_PUBLICO;

// ---------- Prioridades (necessidade × evolução) ----------

type Ordenacao = "PROPORCAO" | "QUANTIDADE" | "QUEDAS";
const ROTULO_ORDENACAO: Record<Ordenacao, string> = {
  PROPORCAO: "Maior proporção em desenvolvimento",
  QUANTIDADE: "Maior quantidade em desenvolvimento",
  QUEDAS: "Mais quedas de conceito",
};
function ordenarPrioridades<T extends { nome: string; emDesenvolvimento: number; pessoas: number; desceram?: number | null }>(l: T[], o: Ordenacao): T[] {
  const prop = (x: T) => (x.pessoas ? x.emDesenvolvimento / x.pessoas : 0);
  return [...l].sort((a, b) =>
    o === "QUANTIDADE"
      ? b.emDesenvolvimento - a.emDesenvolvimento || prop(b) - prop(a)
      : o === "QUEDAS"
        ? (b.desceram ?? -1) - (a.desceram ?? -1) || prop(b) - prop(a)
        : prop(b) - prop(a) || b.emDesenvolvimento - a.emDesenvolvimento || a.nome.localeCompare(b.nome, "pt-BR"),
  );
}

// Barra da proporção de pessoas em desenvolvimento (sem percentual escrito).
function BarraProporcao({ parte, total, rotulo }: { parte: number; total: number; rotulo: string }) {
  return (
    <div role="img" aria-label={rotulo} style={{ height: 10, borderRadius: 999, background: C.linhaSuave, overflow: "hidden", minWidth: 80 }}>
      <div style={{ width: `${total ? (parte / total) * 100 : 0}%`, height: "100%", background: C.atencaoClaro, borderRadius: 999 }} />
    </div>
  );
}

function Evolucao({ subiram, desceram }: { subiram: number | null | undefined; desceram: number | null | undefined }) {
  if (subiram === null || subiram === undefined) return <span style={{ fontSize: 13, color: C.secundario }}>evolução: poucas medições</span>;
  return (
    <span style={{ display: "inline-flex", gap: 12, fontSize: 14, whiteSpace: "nowrap" }}>
      <span style={{ color: C.positivo, fontWeight: 700 }}>▲ {subiram} {subiram === 1 ? "subiu" : "subiram"}</span>
      <span style={{ color: (desceram ?? 0) > 0 ? C.atencao : C.secundario, fontWeight: (desceram ?? 0) > 0 ? 700 : 400 }}>
        ▼ {desceram} {desceram === 1 ? "desceu" : "desceram"}
      </span>
    </span>
  );
}

// Lista compacta: nome · necessidade (barra + "X de Y em desenvolvimento") · evolução (▲ ▼). Mostra os primeiros e "Ver todos".
function ListaPrioridades({ itens, limite = 5, comEvolucao = true, comMotivo = false, vazio }: { itens: any[]; limite?: number; comEvolucao?: boolean; comMotivo?: boolean; vazio: string }) {
  const [todos, setTodos] = useState(false);
  if (!itens.length) return <div style={{ fontSize: 15, color: C.secundario, padding: "8px 0" }}>{vazio}</div>;
  const vis = todos ? itens : itens.slice(0, limite);
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {vis.map((i) => (
        <div key={i.nome} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 20px", padding: "12px 0", borderTop: `1px solid ${C.linhaSuave}` }}>
          <div style={{ flex: "2 1 220px", minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{i.nome}</div>
            {comMotivo && i.motivo && (
              // Só a recomendação: a contagem já aparece na barra ao lado.
              <div style={{ fontSize: 13, color: (i.desceram ?? 0) > (i.subiram ?? 0) ? C.atencao : C.secundario, fontWeight: 600 }}>{String(i.motivo).split(". ").pop()}</div>
            )}
          </div>
          <div style={{ flex: "2 1 220px", display: "flex", flexDirection: "column", gap: 4 }}>
            <BarraProporcao parte={i.emDesenvolvimento} total={i.pessoas} rotulo={`${i.emDesenvolvimento} de ${i.pessoas} em desenvolvimento`} />
            <span style={{ fontSize: 14 }}>
              <strong>
                {i.emDesenvolvimento} de {i.pessoas}
              </strong>{" "}
              <span style={{ color: C.secundario }}>em desenvolvimento</span>
            </span>
          </div>
          {comEvolucao && (
            <div style={{ flex: "1 1 180px", textAlign: "right" }}>
              <Evolucao subiram={i.subiram} desceram={i.desceram} />
            </div>
          )}
        </div>
      ))}
      {itens.length > limite && (
        <button
          type="button"
          onClick={() => setTodos(!todos)}
          style={{ alignSelf: "flex-start", marginTop: 8, minHeight: 40, padding: "0 14px", borderRadius: 10, border: `1px solid ${C.borda}`, background: C.cartao, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.texto }}
        >
          {todos ? "Mostrar menos" : `Ver todos (${itens.length})`}
        </button>
      )}
    </div>
  );
}

// Barra grande por nível, com a quantidade de pessoas em cada conceito.
function DistribuicaoGrande({ dist, rotulo }: { dist: Record<Conceito, number>; rotulo: string }) {
  const total = CONCEITOS.reduce((t, c) => t + (dist?.[c] ?? 0), 0);
  return (
    <div role="img" aria-label={`${rotulo}: ${CONCEITOS.filter((c) => dist?.[c]).map((c) => `${dist[c]} em ${ROTULO_CONCEITO[c]}`).join(", ")}`} style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", gap: 2, background: C.linhaSuave }}>
      {total > 0 &&
        CONCEITOS.map((c) =>
          dist[c] ? (
            <div
              key={c}
              title={`${ROTULO_CONCEITO[c]}: ${dist[c]}`}
              style={{ width: `${(dist[c] / total) * 100}%`, background: COR_CONCEITO[c], color: c === "CONSOLIDADO" || c === "AVANCADO" || c === "REFERENCIA" ? "#FFFFFF" : C.texto, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
            >
              {dist[c] / total >= 0.06 ? dist[c] : ""}
            </div>
          ) : null,
        )}
    </div>
  );
}

function CartaoContexto({ rotulo, valor, detalhe }: { rotulo: string; valor: React.ReactNode; detalhe: React.ReactNode }) {
  return (
    <div style={{ padding: "18px 20px", borderRadius: 14, background: C.cinzaClaro, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.secundario }}>{rotulo}</div>
      <div style={{ fontFamily: FONTE_TITULO, fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>{valor}</div>
      <div style={{ fontSize: 15, color: C.corpo, lineHeight: 1.45 }}>{detalhe}</div>
    </div>
  );
}

// ---------- Página ----------

export function RelatorioFimCiclo() {
  const [modo, setModo] = useState<"SEBRAE" | "AREA">("SEBRAE");
  const [publico, setPublico] = useState<Publico>("TODOS");
  const [area, setArea] = useState<string>("");
  const [abaConhecimento, setAbaConhecimento] = useState<"TECNICO" | "COMPORTAMENTAL">("TECNICO");
  const [abaFortalezas, setAbaFortalezas] = useState<"SEBRAE" | "AREA">("SEBRAE");
  const [abaFoco, setAbaFoco] = useState<"SEBRAE" | "AREA">("SEBRAE");
  const [aberto, setAberto] = useState<string | null>(null);
  const [verEssenciais, setVerEssenciais] = useState(false);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("PROPORCAO");

  // Fontes do relatório (só nesta página).
  useEffect(() => {
    const id = "fonte-relatorio-fim-ciclo";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const unidade = modo === "AREA" && area ? area : undefined;
  const filtro = { ...(unidade ? { unidade } : {}), ...(publico !== "TODOS" ? { publico } : {}) };
  const consulta = api.fimDeCiclo.useQuery(Object.keys(filtro).length ? filtro : undefined, { refetchOnWindowFocus: false, keepPreviousData: true });
  const r: any = consulta.data;

  useEffect(() => {
    if (modo === "AREA" && !area && r?.unidades?.length) setArea(r.unidades[0]);
  }, [modo, area, r]);

  const eixosAba = useMemo(() => (r ? r.instrumentos[abaConhecimento].eixos : []), [r, abaConhecimento]);

  if (consulta.isLoading && !r) {
    return <div style={{ padding: 32, fontFamily: FONTE_TEXTO, color: C.secundario }}>Carregando o relatório de fim de ciclo…</div>;
  }
  if (consulta.isError || !r) {
    return (
      <div style={{ padding: 24, borderRadius: 16, background: C.focoFundo, color: C.focoTexto, fontFamily: FONTE_TEXTO }}>
        Não foi possível carregar o relatório. {consulta.error?.message ?? ""}
      </div>
    );
  }

  const tec = r.instrumentos.TECNICO;
  const comp = r.instrumentos.COMPORTAMENTAL;
  const ctx = r.contexto;
  const adBase = ctx.ad.anoBase ?? ACARREGAR;
  const adAtual = ctx.ad.anoAtual ?? ACARREGAR;
  const tecCompleto = tec.total > 0 && tec.feitas === tec.total;
  const compCompleto = comp.total > 0 && comp.feitas === comp.total;
  const nomeRecorte = (unidade ? nomeArea(unidade) : "Sebrae/TO · todas as áreas") + (publico !== "TODOS" ? ` · ${ROTULO_PUBLICO[publico]}` : "");

  const selo = (completo: boolean, texto: string) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        background: completo ? C.tealFundo : C.focoFundo,
        color: completo ? "#0B5555" : C.focoTexto,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
        {completo ? <path d="M5 12l5 5 9-10" /> : (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>)}
      </svg>
      {texto}
    </span>
  );

  const textoSobem = (destaques: any) =>
    destaques.sobem.length ? destaques.sobem.map((d: any) => `${d.nome} (${d.subiram} de ${d.comparaveis} subiram)`).join(" e ") : null;
  const textoCaem = (destaques: any) =>
    destaques.caem.length ? destaques.caem.map((d: any) => `${d.nome} (${d.desceram} de ${d.comparaveis} desceram)`).join(" e ") : null;

  return (
    <div style={{ fontFamily: FONTE_TEXTO, color: C.texto, background: C.fundo, borderRadius: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 48px", display: "flex", flexDirection: "column", gap: 28 }}>
        {/* Filtro global */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <Abas
            rotulo="Recorte do relatório"
            valor={modo}
            onChange={(v) => setModo(v)}
            opcoes={[
              ["SEBRAE", "Sebrae"],
              ["AREA", "Por área"],
            ]}
          />
          {modo === "AREA" && (
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
              <span style={{ color: C.secundario }}>Área</span>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, padding: "0 12px", fontFamily: "inherit", fontSize: 15, background: C.cartao, maxWidth: "100%" }}
              >
                {(r.unidades as string[]).map((u) => (
                  <option key={u} value={u}>
                    {nomeArea(u)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Abas
            rotulo="Público"
            valor={publico}
            onChange={(v) => setPublico(v)}
            opcoes={[
              ["TODOS", "Todos"],
              ["LIDERES", "Líderes"],
              ["DEMAIS", "Demais empregados"],
            ]}
          />
          {consulta.isFetching && <span style={{ fontSize: 14, color: C.secundario }}>Atualizando…</span>}
        </div>

        {/* Bloco 0 — Cabeçalho */}
        <header style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secundario }}>{nomeRecorte}</div>
            <h1 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 700, letterSpacing: "-0.02em" }}>Fim de ciclo do PDI 2025–2026</h1>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selo(tecCompleto, `Avaliação de Proficiência: ${tecCompleto ? "completa" : "parcial"} · ${tec.feitas} de ${tec.total} avaliações feitas`)}
            {selo(compCompleto, `Avaliação de Desempenho: ${comp.feitas} de ${comp.total} avaliações`)}
          </div>
        </header>

        {r.recorte.amostraPequena && (
          <div style={{ padding: "14px 18px", borderRadius: 14, background: C.focoFundo, color: C.focoTexto, fontSize: 15 }}>
            Este recorte tem menos de 5 pessoas avaliadas: os resultados são amostra pequena e ficam fora de destaques e sínteses.
          </div>
        )}

        {/* Bloco 1 — Sobre este ciclo: quem participou, quando, o que foi avaliado e como anda o PDI */}
        <Secao titulo="Sobre este ciclo" subtitulo="Panorama das avaliações e da execução das ações de desenvolvimento." id="sobre">
          <Grade min={230} gap={12}>
            <CartaoContexto
              rotulo="Pessoas avaliadas"
              valor={ctx.pessoas}
              detalhe={
                <>
                  {unidade ? nomeArea(unidade) : `${ctx.areas.length} ${ctx.areas.length === 1 ? "área participante" : "áreas participantes"}`}
                  {ctx.abrangencia && (
                    <span style={{ display: "block", fontSize: 13, color: C.secundario, marginTop: 4 }}>
                      {ctx.abrangencia.tecnico} na Proficiência · {ctx.abrangencia.comportamental} no Desempenho · {ctx.abrangencia.ambas} nas duas
                    </span>
                  )}
                </>
              }
            />
            <CartaoContexto rotulo="Ações do PDI" valor={ctx.acoes.total} detalhe={`${ctx.acoes.concluidas} concluídas · ${ctx.acoes.emAndamento} em andamento`} />
            <CartaoContexto rotulo="Período do ciclo" valor={<span style={{ fontSize: 22 }}>2025 a {mesAno(ctx.periodo.tecnico.fim)}</span>} detalhe="Proficiência e desempenho" />
            <CartaoContexto rotulo="Execução do PDI" valor={<span style={{ fontSize: 22 }}>{mesAno(ctx.execucao.inicio)} a {mesAno(ctx.execucao.fim)}</span>} detalhe="Período de realização das ações" />
          </Grade>

          {/* Três períodos diferentes, cada um com sua marca */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              ["Avaliação de Proficiência", `2025 → ${mesAno(ctx.periodo.tecnico.fim)}`, C.tealFundo, C.tealTexto],
              ["Avaliação de Desempenho", `${mesAno(ctx.periodo.comportamental.inicio)} → ${mesAno(ctx.periodo.comportamental.fim)}`, C.transvFundo, C.transvTexto],
              ["Execução do PDI", `${mesAno(ctx.execucao.inicio)} → ${mesAno(ctx.execucao.fim)}`, C.focoFundo, C.focoTexto],
            ].map(([rot, per, fundo, cor]) => (
              <span key={rot} style={{ padding: "8px 14px", borderRadius: 999, background: fundo, color: cor, fontSize: 14 }}>
                <strong>{rot}:</strong> {per}
              </span>
            ))}
          </div>

          <div style={{ padding: "18px 20px", borderRadius: 14, border: `1px solid ${C.borda}`, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              <strong style={{ fontSize: 16 }}>Execução das ações de PDI</strong>
              <span style={{ fontSize: 15, color: C.corpo }}>
                {ctx.acoes.concluidas} de {ctx.acoes.total} concluídas
              </span>
            </div>
            <div role="img" aria-label={`${ctx.acoes.concluidas} concluídas, ${ctx.acoes.emAndamento} em andamento, ${ctx.acoes.canceladas} canceladas`} style={{ display: "flex", height: 14, borderRadius: 999, overflow: "hidden", gap: 2, background: C.linhaSuave }}>
              {[
                [ctx.acoes.concluidas, C.positivo],
                [ctx.acoes.emAndamento, C.positivoClaro],
                [ctx.acoes.canceladas, C.neutro],
              ].map(([n, cor], k) => ((n as number) > 0 ? <div key={k} style={{ width: `${((n as number) / Math.max(ctx.acoes.total, 1)) * 100}%`, background: cor as string }} /> : null))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 14, color: C.corpo }}>
              {[
                ["Concluídas", ctx.acoes.concluidas, C.positivo],
                ["Em andamento", ctx.acoes.emAndamento, C.positivoClaro],
                ["Canceladas", ctx.acoes.canceladas, C.neutro],
              ].map(([rot, n, cor]) => (
                <span key={rot as string} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: cor as string }} />
                  {rot}: <strong>{n as number}</strong>
                </span>
              ))}
            </div>
          </div>

          <Grade min={340} gap={20}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Eixos técnicos avaliados</div>
                <div style={{ fontSize: 14, color: C.secundario }}>Avaliação de Proficiência · {new Set(ctx.eixos.map((e: any) => e.nome)).size} eixos</div>
              </div>
              {(() => {
                const transv = ctx.eixos.filter(GRUPOS_EIXO[0].filtro);
                const lider = ctx.eixos.filter(GRUPOS_EIXO[1].filtro);
                const jaListados = new Set([...transv, ...lider].map((e: any) => e.nome));
                const essenciais = ctx.eixos.filter((e: any) => !e.transversal && !jaListados.has(e.nome));
                const LIMITE = 6;
                const grupos = [
                  { titulo: "Transversais", sub: "comuns a todo o Sebrae", l: transv, tipo: "transversal" as const },
                  { titulo: "Liderança", sub: "comuns a todos os líderes", l: lider, tipo: "transversal" as const },
                  { titulo: "Essenciais", sub: "específicos de cada área", l: verEssenciais ? essenciais : essenciais.slice(0, LIMITE), tipo: "neutro" as const, resto: essenciais.length - LIMITE },
                ];
                return grupos.map((g) =>
                  g.l.length ? (
                    <div key={g.titulo} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.corpo }}>
                        {g.titulo} <span style={{ fontWeight: 400, color: C.secundario }}>· {g.sub}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {g.l.map((e: any) => (
                          <Chip key={e.nome} tipo={g.tipo}>
                            {e.nome}
                          </Chip>
                        ))}
                        {"resto" in g && (g.resto ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={() => setVerEssenciais(!verEssenciais)}
                            style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${C.borda}`, background: C.cartao, fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer", color: C.positivo }}
                          >
                            {verEssenciais ? "Ocultar" : `+ ${g.resto} eixos essenciais`}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null,
                );
              })()}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Competências avaliadas</div>
                <div style={{ fontSize: 14, color: C.secundario }}>Avaliação de Desempenho · {ctx.competencias.length} competências</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(190px, 100%), 1fr))", gap: 8 }}>
                {ctx.competencias.map((c: any) => (
                  <div key={c.nome} style={{ padding: "10px 12px", borderRadius: 10, background: c.transversal ? C.transvFundo : C.cinzaClaro, color: c.transversal ? C.transvTexto : C.texto, fontSize: 14, fontWeight: c.transversal ? 600 : 400 }}>
                    {c.nome}
                  </div>
                ))}
              </div>
            </div>
          </Grade>
          <p style={{ margin: 0, fontSize: 14, color: C.secundario }}>
            Expectativa de desenvolvimento: Conhecimento Aplicado ou acima, nos dois instrumentos. Cada avaliação é o resultado de uma pessoa em um eixo ou competência; uma pessoa pode ter feito só uma das avaliações. Técnico e comportamental são lidos separadamente.
          </p>
        </Secao>

        {/* Bloco 2 — Resultado geral: quanto evoluímos, onde evoluímos e o que desenvolver */}
        <Secao titulo="Resultado geral" subtitulo="Evolução das avaliações e prioridades para o próximo ciclo." id="resultado">
          <Grade min={360} gap={16}>
            {[
              { titulo: "Conhecimento técnico", periodo: "Proficiência 2025 × 2026", x: tec, tipo: "TECNICO" },
              { titulo: "Competências comportamentais", periodo: `Desempenho ${adBase} × ${adAtual}`, x: comp, tipo: "COMPORTAMENTAL" },
            ].map((c) => {
              const delta = c.x.naExpectativaDepois - c.x.naExpectativaAntes;
              return (
                <article key={c.titulo} style={{ border: `1px solid ${C.borda}`, borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 700 }}>{c.titulo}</span>
                    <span style={{ fontSize: 14, color: C.secundario }}>{c.periodo}</span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
                    <span style={{ fontFamily: FONTE_TITULO, fontSize: "clamp(34px, 5vw, 44px)", fontWeight: 700, color: C.positivo, letterSpacing: "-0.02em" }}>
                      {c.x.naExpectativaAntes} → {c.x.naExpectativaDepois}
                    </span>
                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontFamily: FONTE_TITULO,
                        fontSize: 18,
                        fontWeight: 700,
                        background: delta > 0 ? C.tealFundo : delta < 0 ? C.focoFundo : C.linhaSuave,
                        color: delta > 0 ? C.positivo : delta < 0 ? C.atencao : C.secundario,
                      }}
                    >
                      {delta > 0 ? `+${delta}` : delta < 0 ? `−${Math.abs(delta)}` : "="}
                    </span>
                  </div>
                  <div style={{ fontSize: 15, color: C.corpo }}>
                    avaliações na expectativa de desenvolvimento, de <strong>{c.x.comparaveis}</strong> com as duas medições
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px", fontSize: 14, color: C.secundario }}>
                    <span style={{ color: C.positivo, fontWeight: 700 }}>▲ {c.x.subiram} subiram</span>
                    <span>= {c.x.mantiveram} mantiveram</span>
                    <span style={{ color: C.atencao, fontWeight: 700 }}>▼ {c.x.desceram} desceram</span>
                  </div>
                  {c.tipo === "TECNICO" && c.x.aguardando > 0 && (
                    <div style={{ fontSize: 13, color: C.secundario }}>
                      {c.x.aguardando} de {c.x.total} avaliações aguardam a Avaliação de Proficiência 2026
                      {c.x.primeiraMedicao > 0 ? ` · ${c.x.primeiraMedicao} são primeira medição` : ""}.
                    </div>
                  )}
                </article>
              );
            })}
          </Grade>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 4 }}>
            <div>
              <h3 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 18, fontWeight: 600 }}>Evolução por dimensão</h3>
              <div style={{ fontSize: 14, color: C.secundario }}>Quantas avaliações em cada conceito, antes e depois, sobre as mesmas avaliações.</div>
            </div>
            <LegendaConceitos />
            <Grade min={360} gap={24}>
              {[
                { titulo: "Técnica", x: tec, ini: "2025", fim: "2026" },
                { titulo: "Comportamental", x: comp, ini: String(adBase), fim: String(adAtual) },
              ].map((d) => (
                <div key={d.titulo} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <strong style={{ fontSize: 15 }}>{d.titulo}</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: "8px 10px", alignItems: "center", fontSize: 14, color: C.secundario }}>
                    <span>{d.ini}</span>
                    <DistribuicaoGrande dist={d.x.distribuicaoAntes} rotulo={`${d.titulo} ${d.ini}`} />
                    <span>{d.fim}</span>
                    <DistribuicaoGrande dist={d.x.distribuicaoDepois} rotulo={`${d.titulo} ${d.fim}`} />
                  </div>
                </div>
              ))}
            </Grade>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 4 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 18, fontWeight: 600 }}>Prioridades para o próximo ciclo</h3>
                <div style={{ fontSize: 14, color: C.secundario }}>Pessoas no conceito Em Desenvolvimento, de quantas já têm a medição atual. Ordenado pela proporção.</div>
              </div>
              <a href="#foco" style={{ fontSize: 14, fontWeight: 600, color: C.positivo }}>
                Ver o foco completo ›
              </a>
            </div>
            <Grade min={340} gap={20}>
              {[
                ...GRUPOS_EIXO.map((g) => ({ titulo: g.titulo, l: tec.ondeFocar.itens.filter(g.filtro) })),
                { titulo: "Competências", l: comp.ondeFocar.itens },
              ]
                .filter((g) => g.l.length)
                .map((g) => (
                  <div key={g.titulo}>
                    <div style={{ fontWeight: 700, fontSize: 15, paddingBottom: 4 }}>{g.titulo}</div>
                    <ListaPrioridades itens={ordenarPrioridades(g.l, "PROPORCAO")} limite={3} comEvolucao={false} vazio="" />
                  </div>
                ))}
            </Grade>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 4 }}>
            <h3 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 18, fontWeight: 600 }}>Análise da evolução</h3>
            <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, fontSize: 15, color: C.corpo, lineHeight: 1.5 }}>
              {[
                ["transversais", textoSobem(tec.destaquesPorTipo.transversais)],
                ["de liderança", textoSobem(tec.destaquesPorTipo.lideranca)],
                ["essenciais", textoSobem(tec.destaquesPorTipo.essenciais)],
              ]
                .filter(([, t]) => t)
                .map(([g, t]) => (
                  <li key={g as string}>
                    <strong>Técnico, eixos {g}:</strong> mais cresceram {t}.
                  </li>
                ))}
              {textoSobem(comp.destaques) && (
                <li>
                  <strong>Competências que mais subiram:</strong> {textoSobem(comp.destaques)}.
                </li>
              )}
              {textoCaem(comp.destaques) && (
                <li>
                  <strong>Competências que mais desceram:</strong> {textoCaem(comp.destaques)}. Medido antes das ações do PDI.
                </li>
              )}
            </ul>
          </div>
          <Sintese texto={r.sinteses.resultado} />
        </Secao>

        {/* Bloco 3 — Como as avaliações fecharam o ciclo */}
        <Secao
          titulo="Como as avaliações fecharam o ciclo"
          subtitulo="Cada avaliação é o resultado de uma pessoa em um eixo técnico ou em uma competência, comparando o conceito anterior com o atual."
          id="fechamento"
        >
          <Grade min={320} gap={20}>
            <Barra titulo="Técnico" grupos={tec.grupos} total={tec.total} />
            <Barra titulo="Comportamental" grupos={comp.grupos} total={comp.total} />
          </Grade>
          <Grade min={220} gap={12}>
            {GRUPOS.map((g) => (
              <div key={g} style={{ display: "flex", gap: 12, padding: 14, borderRadius: 12, background: C.cinzaClaro }}>
                <span style={{ width: 12, height: 12, borderRadius: 4, background: COR_GRUPO[g], marginTop: 5, flex: "none" }} />
                <div>
                  <div style={{ fontWeight: 600 }}>{ROTULO_GRUPO[g]}</div>
                  <div style={{ fontSize: 14, color: C.secundario }}>
                    Técnico {tec.grupos[g]} · Comportamental {comp.grupos[g]}
                  </div>
                  {g === "MANTEVE" && tec.classes.ATENCAO + comp.classes.ATENCAO > 0 && (
                    <div style={{ fontSize: 13, color: C.secundario }}>{tec.classes.ATENCAO + comp.classes.ATENCAO} com atenção: desceram de conceito, mas seguem na expectativa</div>
                  )}
                  {g === "ABAIXO" && tec.classes.ABAIXO_NOVA + comp.classes.ABAIXO_NOVA > 0 && (
                    <div style={{ fontSize: 13, color: C.secundario }}>{tec.classes.ABAIXO_NOVA + comp.classes.ABAIXO_NOVA} estavam na expectativa e pedem novo foco</div>
                  )}
                  {g === "SEM_COMPARACAO" && (
                    <div style={{ fontSize: 13, color: C.secundario }}>
                      {tec.classes.SEM_COMPARACAO + comp.classes.SEM_COMPARACAO} aguardam medição · {tec.classes.PRIMEIRA_MEDICAO + comp.classes.PRIMEIRA_MEDICAO} primeira medição
                    </div>
                  )}
                </div>
              </div>
            ))}
          </Grade>
          <Sintese texto={r.sinteses.fechamento} />
        </Secao>

        {/* Bloco 4 — Onde está o conhecimento da equipe */}
        <Secao
          titulo="Onde está o conhecimento da equipe"
          subtitulo="Como as pessoas se distribuem pelos conceitos, antes e depois, sobre as mesmas avaliações. No técnico, eixos transversais, de liderança e essenciais aparecem separados; dentro de cada grupo, do maior para o menor número de pessoas avaliadas."
          id="conhecimento"
          acao={
            <Abas
              rotulo="Instrumento"
              valor={abaConhecimento}
              onChange={setAbaConhecimento}
              opcoes={[
                ["TECNICO", "Técnico"],
                ["COMPORTAMENTAL", "Comportamental"],
              ]}
            />
          }
        >
          {/* Filtros de departamento e público: os mesmos do topo, para filtrar sem subir a página. */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: C.secundario }}>
              Departamento
              <select
                value={modo === "AREA" ? area : ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setArea(e.target.value);
                    setModo("AREA");
                  } else setModo("SEBRAE");
                }}
                style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, padding: "0 12px", fontFamily: "inherit", fontSize: 15, background: C.cartao, maxWidth: "100%" }}
              >
                <option value="">Todos os departamentos</option>
                {(r.unidades as string[]).map((u) => (
                  <option key={u} value={u}>
                    {nomeArea(u)}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: C.secundario }}>
              Público
              <select
                value={publico}
                onChange={(e) => setPublico(e.target.value as Publico)}
                style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, padding: "0 12px", fontFamily: "inherit", fontSize: 15, background: C.cartao }}
              >
                <option value="TODOS">Todos</option>
                <option value="LIDERES">Líderes</option>
                <option value="DEMAIS">Demais empregados</option>
              </select>
            </label>
            <span style={{ fontSize: 13, color: C.secundario, paddingBottom: 12 }}>
              {consulta.isFetching ? "Atualizando…" : "Estes filtros valem para todo o relatório."}
            </span>
          </div>
          <LegendaConceitos />
          {abaConhecimento === "COMPORTAMENTAL" && (
            <p style={{ margin: 0, fontSize: 14, color: C.corpo }}>
              As ações do PDI vieram depois da AD {adAtual}; estes resultados são o ponto de partida do PDI comportamental.
            </p>
          )}
          {(abaConhecimento === "TECNICO"
            ? GRUPOS_EIXO.map((g) => ({ titulo: g.titulo as string | null, sub: g.sub as string | null, l: eixosAba.filter(g.filtro) }))
            : [{ titulo: null as string | null, sub: null as string | null, l: eixosAba }]
          ).map((g) =>
            g.l.length ? (
          <div key={g.titulo ?? "todos"} style={{ display: "flex", flexDirection: "column" }}>
            {g.titulo && (
              <div style={{ padding: "8px 0 12px" }}>
                <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 17 }}>{g.titulo}</div>
                <div style={{ fontSize: 14, color: C.secundario }}>{g.sub}</div>
              </div>
            )}
            {g.l.map((e: any) => {
              const chave = `${abaConhecimento}|${e.nome}`;
              const expandido = aberto === chave;
              const inicio = abaConhecimento === "TECNICO" ? "2025" : String(adBase);
              const fim = abaConhecimento === "TECNICO" ? "2026" : String(adAtual);
              return (
                <div key={chave} style={{ borderTop: `1px solid ${C.linhaSuave}` }}>
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, padding: "16px 0" }}>
                    <div style={{ flex: "1 1 240px", minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <button
                        type="button"
                        aria-expanded={expandido}
                        onClick={() => setAberto(expandido ? null : chave)}
                        style={{ textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: 16, color: C.texto, minHeight: 28 }}
                      >
                        {e.nome} <span aria-hidden="true" style={{ color: C.secundario, fontSize: 12 }}>{expandido ? "▲" : "▼"}</span>
                      </button>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", fontSize: 13, color: C.secundario }}>
                        {e.comparaveis} de {e.pessoas} pessoas com as duas medições
                        {e.amostraPequena && <Etiqueta>amostra pequena</Etiqueta>}
                      </div>
                    </div>
                    {e.comparaveis > 0 ? (
                      <div style={{ flex: "2 1 300px", display: "grid", gridTemplateColumns: "40px 1fr", gap: "6px 10px", alignItems: "center", fontSize: 13, color: C.secundario }}>
                        <span>{inicio}</span>
                        <Distribuicao dist={e.distribuicaoAntes} rotulo={`${e.nome}, ${inicio}`} altura={12} />
                        <span>{fim}</span>
                        <Distribuicao dist={e.distribuicaoDepois} rotulo={`${e.nome}, ${fim}`} altura={12} />
                      </div>
                    ) : (
                      <div style={{ flex: "2 1 300px", fontSize: 14, color: C.secundario }}>{e.aguardando} aguardam a medição atual</div>
                    )}
                    <div style={{ flex: "0 0 190px", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, fontSize: 14 }}>
                      {e.comparaveis > 0 && (
                        <>
                          <span style={{ color: C.positivo, fontWeight: 700 }}>{cont(e.subiram, "subiu", "subiram")} de conceito</span>
                          <span style={{ color: e.desceram > 0 ? C.atencao : C.secundario, fontWeight: e.desceram > 0 ? 700 : 400 }}>{cont(e.desceram, "desceu", "desceram")}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {expandido && (
                    <div style={{ margin: "0 0 16px", padding: 16, borderRadius: 12, background: C.cinzaClaro, fontSize: 14, color: C.corpo, display: "flex", flexDirection: "column", gap: 6 }}>
                      {abaConhecimento === "TECNICO" ? (
                        <>
                          <div>
                            <strong>O que este eixo abrange:</strong> {e.descricao || ACARREGAR}
                          </div>
                          <div>
                            <strong>Resultado por conhecimento:</strong> {ACARREGAR} (depende do mapeamento de cada questão da Avaliação de Proficiência para o conhecimento avaliado).
                          </div>
                        </>
                      ) : (
                        <div>
                          <strong>Resultado por comportamento observável:</strong> {ACARREGAR} (depende das notas por indicador na Avaliação de Desempenho).
                        </div>
                      )}
                      <div>
                        Hoje: {e.nAtual} pessoas com a medição atual
                        {e.predominanteAtual ? `, conceito mais frequente: ${ROTULO_CONCEITO[e.predominanteAtual as Conceito]}` : ""}; {e.emDesenvolvimento} no conceito Em Desenvolvimento.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
            ) : null,
          )}
          <Sintese texto={abaConhecimento === "TECNICO" ? r.sinteses.tecnico : r.sinteses.comportamental} />
        </Secao>

        {/* Matriz de conhecimento por área (sem nomes) */}
        {r.matriz && <MatrizPorArea matriz={r.matriz} />}

        {/* Bloco 5 — Como o PDI está acontecendo + Fortalezas e multiplicadores */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Grade min={320}>
            <article style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 22, fontWeight: 600 }}>Como o PDI está acontecendo</h2>
                <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>O caminho percorrido no ano e onde ele já mostra resultado, área por área.</p>
              </div>
              {[
                {
                  titulo: "Planejamento · técnico",
                  sub: "Pontos de partida no conceito Em Desenvolvimento (Proficiência 2025) que já têm plano",
                  x: r.pdi.planejamento.TECNICO.comPlano,
                  y: r.pdi.planejamento.TECNICO.total,
                },
                {
                  titulo: "Planejamento · competências",
                  sub: `Pontos de partida no conceito Em Desenvolvimento (AD ${adAtual}) que já têm plano`,
                  x: r.pdi.planejamento.COMPORTAMENTAL.comPlano,
                  y: r.pdi.planejamento.COMPORTAMENTAL.total,
                },
                {
                  titulo: "Execução",
                  sub: "Ações técnicas concluídas antes da nova medição, de quem já fez a Avaliação de Proficiência 2026",
                  x: r.pdi.execucao.concluidasAntes,
                  y: r.pdi.execucao.total,
                },
              ].map((l) => (
                <div key={l.titulo} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: 16, borderRadius: 12, background: C.cinzaClaro }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.titulo}</div>
                    <div style={{ fontSize: 14, color: C.secundario }}>{l.sub}</div>
                  </div>
                  <div style={{ textAlign: "right", flex: "none", fontFamily: FONTE_TITULO, fontSize: 22, fontWeight: 700 }}>
                    {l.y ? `${l.x} de ${l.y}` : "Nenhum"}
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 12, background: C.tealFundo }}>
                <div style={{ fontWeight: 600, color: C.tealTexto }}>Onde já há sinais de resultado</div>
                {r.pdi.sinaisPorArea.length ? (
                  r.pdi.sinaisPorArea.map((s: any) => (
                    <div key={s.area} style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, fontSize: 15, padding: "8px 0", borderBottom: "1px solid rgba(11,85,85,0.15)" }}>
                      <span>{nomeArea(s.area)}</span>
                      <span style={{ color: C.tealTexto, fontWeight: 600 }}>
                        {s.chegaram} de {s.total} avaliações com ação chegaram à expectativa
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 15, color: C.tealTexto }}>
                    Ainda não há área com 5 ou mais avaliações técnicas que partiram de Em Desenvolvimento e tiveram ação concluída antes da nova medição.
                  </div>
                )}
                {r.pdi.areasAmostraPequena > 0 && (
                  <div style={{ fontSize: 13, color: "#2E5555" }}>{r.pdi.areasAmostraPequena === 1 ? "1 área com menos de 5 avaliações nessa condição fica fora da lista." : `${r.pdi.areasAmostraPequena} áreas com menos de 5 avaliações nessa condição ficam fora da lista.`}</div>
                )}
                <div style={{ fontSize: 13, lineHeight: 1.5, color: "#2E5555" }}>
                  Cada área é lida no seu ritmo. Uma leitura para o Sebrae como um todo virá quando houver medições comparáveis suficientes (mínimo de {r.parametros.comparacaoMinima} avaliações por grupo).
                </div>
              </div>
            </article>

            <article style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: 28, display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 22, fontWeight: 600 }}>Fortalezas e multiplicadores</h2>
                <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>Quem domina um eixo pode apoiar quem está desenvolvendo.</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, padding: 18, borderRadius: 14, background: C.tealFundo }}>
                <div style={{ fontFamily: FONTE_TITULO, fontSize: 40, fontWeight: 700, color: "#0B5555" }}>{r.fortalezas.multiplicadores.total}</div>
                <div style={{ fontSize: 15, lineHeight: 1.5, color: C.tealTexto }}>
                  vezes em que uma pessoa alcançou Conhecimento Aplicado ou acima em um eixo técnico que não é exigido na sua função, em {r.fortalezas.multiplicadores.eixos} eixos. É conhecimento que ela pode ensinar a quem precisa.
                  {r.fortalezas.multiplicadores.porEixo.length > 0 && (
                    <> Mais frequentes: {r.fortalezas.multiplicadores.porEixo.map((e: any) => `${e.nome} (${e.vezes})`).join(", ")}.</>
                  )}
                </div>
              </div>
              <Abas
                rotulo="Recorte das fortalezas"
                valor={abaFortalezas}
                onChange={setAbaFortalezas}
                opcoes={[
                  ["SEBRAE", "Sebrae · transversais"],
                  ["AREA", "Por área"],
                ]}
              />
              {(() => {
                const linhaForca = (rotulo: React.ReactNode, e: any, chave: string) => (
                  <div key={chave} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderBottom: `1px solid ${C.linhaSuave}` }}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                      <span>{rotulo}</span>
                      <strong style={{ fontSize: 14 }}>
                        {e.fortes} de {e.pessoas} em Avançado ou Referência
                      </strong>
                    </div>
                    <Distribuicao dist={e.distribuicao} rotulo={e.nome} altura={8} />
                  </div>
                );
                return abaFortalezas === "SEBRAE" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 14, color: C.secundario, paddingBottom: 6 }}>Conhecimentos comuns a todos, onde a força é da organização. Medição atual.</div>
                    {r.fortalezas.transversais.length ? (
                      r.fortalezas.transversais.map((t: any) =>
                        linhaForca(
                          <>
                            <strong>{t.nome}</strong> <span style={{ color: C.secundario }}>· {t.pessoas} pessoas</span>
                          </>,
                          t,
                          t.nome,
                        ),
                      )
                    ) : (
                      <div style={{ fontSize: 15, color: C.secundario }}>Nenhum eixo transversal com medição de 5 pessoas ou mais neste recorte.</div>
                    )}
                    {r.fortalezas.lideranca.length > 0 && (
                      <>
                        <div style={{ fontSize: 14, color: C.secundario, padding: "14px 0 6px" }}>Eixos de liderança, comuns a todos os líderes.</div>
                        {r.fortalezas.lideranca.map((t: any) =>
                          linhaForca(
                            <>
                              <strong>{t.nome}</strong> <span style={{ color: C.secundario }}>· {t.pessoas} líderes</span>
                            </>,
                            t,
                            `L|${t.nome}`,
                          ),
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ fontSize: 14, color: C.secundario, paddingBottom: 6 }}>Conhecimentos específicos de cada área, com no mínimo 5 pessoas.</div>
                    {r.fortalezas.porArea.length ? (
                      r.fortalezas.porArea.flatMap((a: any) =>
                        a.eixos.map((e: any) =>
                          linhaForca(
                            <>
                              <span style={{ color: C.secundario }}>{nomeArea(a.area).split(" · ")[0]} · </span>
                              <strong>{e.nome}</strong> <span style={{ color: C.secundario }}>· {e.pessoas} pessoas</span>
                            </>,
                            e,
                            `${a.area}|${e.nome}`,
                          ),
                        ),
                      )
                    ) : (
                      <div style={{ fontSize: 15, color: C.secundario }}>Nenhum eixo específico com medição de 5 pessoas ou mais neste recorte.</div>
                    )}
                  </div>
                );
              })()}
            </article>
          </Grade>
          <Sintese texto={r.sinteses.pdi} />
        </section>

        {/* Bloco 6 — Foco de desenvolvimento: transforma os resultados em prioridades do próximo PDI */}
        <Secao
          titulo="Foco de desenvolvimento do próximo ciclo"
          subtitulo="Os conhecimentos e competências que precisam de maior atenção no próximo PDI."
          id="foco"
          acao={
            <Abas
              rotulo="Recorte do foco"
              valor={abaFoco}
              onChange={setAbaFoco}
              opcoes={[
                ["SEBRAE", "Sebrae"],
                ["AREA", "Por área"],
              ]}
            />
          }
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 14, color: C.corpo, maxWidth: 680 }}>
              <strong>Necessidade</strong>: quantas pessoas estão no conceito Em Desenvolvimento. <strong>Evolução</strong>: quantas subiram ou desceram de conceito entre as duas medições. Um item pode ter muitos avanços e ainda precisar de ações.
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, fontWeight: 600, color: C.secundario }}>
              Ordenar por
              <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value as Ordenacao)} style={{ minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, padding: "0 12px", fontFamily: "inherit", fontSize: 15, background: C.cartao }}>
                {(Object.keys(ROTULO_ORDENACAO) as Ordenacao[]).map((o) => (
                  <option key={o} value={o}>
                    {ROTULO_ORDENACAO[o]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {abaFoco === "SEBRAE" ? (
            <>
              <Grade min={200} gap={12}>
                {[
                  ["Eixos transversais", r.foco.sebrae.tecnicos.length],
                  ...(r.recorte.publico !== "DEMAIS" ? [["Eixos de liderança", r.foco.sebrae.lideranca.length]] : []),
                  ["Competências", r.foco.sebrae.competencias.length],
                ].map(([rot, n]) => (
                  <div key={rot as string} style={{ padding: "16px 18px", borderRadius: 14, background: (n as number) ? C.focoFundo : C.cinzaClaro }}>
                    <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: C.secundario }}>{rot}</div>
                    <div style={{ fontFamily: FONTE_TITULO, fontSize: 28, fontWeight: 700, color: (n as number) ? C.focoTexto : C.secundario }}>{n as number}</div>
                    <div style={{ fontSize: 14, color: C.corpo }}>{(n as number) ? "com foco de desenvolvimento" : "nenhuma prioridade identificada"}</div>
                  </div>
                ))}
              </Grade>
              {[
                { titulo: "Eixos técnicos transversais", l: r.foco.sebrae.tecnicos, mostrar: true },
                { titulo: "Eixos de liderança", l: r.foco.sebrae.lideranca, mostrar: r.recorte.publico !== "DEMAIS" },
                { titulo: "Competências comportamentais", l: r.foco.sebrae.competencias, mostrar: true },
              ]
                .filter((g) => g.mostrar)
                .map((g) =>
                  g.l.length ? (
                    <div key={g.titulo} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                        <strong style={{ fontSize: 17 }}>{g.titulo}</strong>
                        <span style={{ fontSize: 14, color: C.secundario }}>
                          {g.l.length} {g.l.length === 1 ? "item" : "itens"}
                        </span>
                      </div>
                      <ListaPrioridades itens={ordenarPrioridades(g.l, ordenacao)} limite={5} comMotivo vazio="" />
                    </div>
                  ) : (
                    <div key={g.titulo} style={{ padding: "12px 16px", borderRadius: 12, background: C.cinzaClaro, fontSize: 15, color: C.corpo }}>
                      <strong>{g.titulo}:</strong> nenhum com pessoas no conceito Em Desenvolvimento ou com mais quedas do que avanços.
                    </div>
                  ),
                )}
            </>
          ) : r.foco.porArea.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {r.foco.porArea.map((a: any) => (
                <div key={a.area} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 17 }}>{nomeArea(a.area)}</div>
                  <Grade min={340} gap={20}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Eixos essenciais da área</div>
                      <ListaPrioridades itens={ordenarPrioridades(a.tecnicos, ordenacao)} limite={4} vazio="Nenhum eixo com 5 pessoas ou mais nesta condição." />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>Competências</div>
                      <ListaPrioridades itens={ordenarPrioridades(a.competencias, ordenacao)} limite={4} vazio="Nenhuma competência com 5 pessoas ou mais nesta condição." />
                    </div>
                  </Grade>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>Nenhum eixo ou competência atende ao critério neste recorte (mínimo de 5 pessoas).</p>
          )}
          <p style={{ margin: 0, fontSize: 13, color: C.secundario }}>
            Critério: eixos e competências com pessoas no conceito Em Desenvolvimento ou com mais pessoas descendo do que subindo de conceito. Pessoas = quem já tem a medição atual. A ordenação só muda a leitura; a regra de prioridade é a mesma.
          </p>
        </Secao>

        {/* Bloco 7 — Quanto investimos onde mais crescemos */}
        <Secao titulo="Quanto investimos onde mais crescemos" subtitulo="Ações do PDI concluídas antes da nova medição, comparadas a quantas pessoas subiram de conceito." id="investimento">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ textAlign: "left", color: C.secundario, fontSize: 13 }}>
                  {["Eixo ou competência", "Pessoas", "Subiram de conceito", "Desceram", "Pessoas com ação concluída", "Ações concluídas"].map((h, i) => (
                    <th key={h} style={{ padding: "10px 12px", fontWeight: 600, borderBottom: `1px solid ${C.borda}`, textAlign: i >= 2 ? "right" : "left" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {r.investimento.length ? (
                  r.investimento.map((l: any) => (
                    <tr key={`${l.tipo}|${l.nome}`}>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}` }}>
                        <strong>{l.nome}</strong>
                        <div style={{ fontSize: 13, color: C.secundario }}>
                          {l.tipo === "TECNICO" ? (l.lideranca ? "Técnico · liderança" : l.transversal ? "Técnico · transversal" : "Técnico · essencial") : "Comportamental"}
                          {l.contraste ? " · para comparar" : ""}
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}` }}>{l.pessoas}</td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right", fontWeight: 700, color: C.positivo }}>{l.subiram}</td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right", color: l.desceram > 0 ? C.atencao : C.secundario }}>{l.desceram}</td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right" }}>
                        {l.comAcao} de {l.pessoas}
                      </td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right" }}>{l.acoes}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ padding: "14px 12px", color: C.secundario }}>
                      Ainda não há eixo ou competência com 5 pessoas ou mais e as duas medições.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: C.secundario }}>
            Conta só ações concluídas antes da nova medição. No comportamental, as ações deste ciclo vieram depois da AD {adAtual}: a leitura vale a partir da próxima AD. A relação mostra onde o investimento acompanhou o crescimento, não demonstra causa.
          </p>
          <Sintese texto={r.sinteses.investimento} />
        </Secao>

        {/* Bloco 8 — Encaminhamentos */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "18px 22px", borderRadius: 16, background: C.cartao, border: `1px solid ${C.borda}` }} aria-label="Encaminhamentos">
          <span style={{ fontWeight: 700 }}>Encaminhamentos</span>
          {r.encaminhamentos.map((e: string) => (
            <span key={e} style={{ padding: "8px 14px", borderRadius: 999, background: C.cinzaClaro, fontSize: 14 }}>
              {e}
            </span>
          ))}
        </section>

        {/* Bloco 9 — Como ler este relatório */}
        <details style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 16, padding: "20px 24px" }}>
          <summary style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 16, minHeight: 44, cursor: "pointer", listStyle: "none" }}>
            Como ler este relatório <span style={{ fontSize: 14, color: C.secundario, fontWeight: 500 }}>metodologia e definições</span>
          </summary>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 16, marginTop: 16, fontSize: 15, lineHeight: 1.55, color: C.corpo }}>
            <p style={{ margin: 0 }}>
              <strong>Avaliação</strong> é o resultado de uma pessoa em um eixo técnico ou em uma competência, lido em conceito.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Conceitos:</strong> Em Desenvolvimento, Conhecimento Aplicado, Conhecimento Consolidado, Conhecimento Avançado e Referência — a mesma régua que empregados e líderes veem no sistema, para os dois instrumentos.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Expectativa de desenvolvimento</strong> é alcançar Conhecimento Aplicado ou acima. Técnico e comportamental são lidos separadamente e nunca somados.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Ponto de partida</strong> é a primeira medição de cada avaliação. Só existe evolução quando há uma nova medição para comparar; a primeira medição não conta como evolução.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Subiu, manteve ou desceu</strong> compara o conceito anterior com o atual, sempre sobre as mesmas avaliações (as que têm as duas medições).
            </p>
            <p style={{ margin: 0 }}>
              <strong>Classificações:</strong> já na expectativa e manteve; atenção (desceu de conceito, mas segue na expectativa); chegou à expectativa neste ciclo; Em Desenvolvimento; primeira medição; aguardando medição.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Amostra pequena</strong> marca eixos com menos de {r.parametros.amostraMinima} pessoas com as duas medições; esses resultados não entram em destaques nem sínteses.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Multiplicadores:</strong> vezes em que uma pessoa alcançou Conhecimento Aplicado ou acima em um eixo técnico que não é exigido na sua função — conhecimento que ela pode ensinar.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Privacidade:</strong> esta página mostra apenas dados agregados. Resultados individuais ficam com cada pessoa e seu líder (LGPD e NR-1).
            </p>
          </div>
        </details>
      </div>
    </div>
  );
}

