import React, { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { fmtDelta, fmtNum, fmtPct, fraseVariacao, sentido } from "../../../shared/fimDeCicloRegras";

// Relatório de Fim de Ciclo do PDI — página da diretoria.
// Segue a "Especificação de ajustes — Relatório de Fim de Ciclo do PDI" e o
// protótipo visual "Página da diretoria". Só dados agregados: nenhum nome de pessoa.

const api = (trpc as any).evolucaoCiclo;

const C = {
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

const FONTE_TITULO = "'Sora', system-ui, sans-serif";
const FONTE_TEXTO = "'Source Sans 3', system-ui, sans-serif";

const COR_GRUPO: Record<string, string> = {
  MANTEVE: C.positivo,
  CHEGOU: C.positivoClaro,
  ABAIXO: C.atencaoClaro,
  SEM_COMPARACAO: C.neutro,
};
const ROTULO_GRUPO: Record<string, string> = {
  MANTEVE: "Já acima de 70% e manteve",
  CHEGOU: "Chegou a 70% neste ciclo",
  ABAIXO: "Abaixo de 70%",
  SEM_COMPARACAO: "Sem comparação",
};
const GRUPOS = ["MANTEVE", "CHEGOU", "ABAIXO", "SEM_COMPARACAO"] as const;

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
function mesAno(iso: string | null | undefined) {
  if (!iso) return "[a carregar]";
  const [a, m] = iso.split("-");
  return `${MESES[Number(m) - 1]}/${a}`;
}

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "com", "a", "o", "em", "para"]);
function nomeArea(area: string | null | undefined) {
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

const corDelta = (v: number | null | undefined) => {
  const s = sentido(v);
  return s === "positivo" ? C.positivo : s === "negativo" ? C.atencao : C.secundario;
};

// ---------- Peças visuais ----------

function Secao({ titulo, subtitulo, acao, children, id }: { titulo: string; subtitulo?: string; acao?: React.ReactNode; children: React.ReactNode; id?: string }) {
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

function Abas<T extends string>({ opcoes, valor, onChange, rotulo }: { opcoes: Array<[T, string]>; valor: T; onChange: (v: T) => void; rotulo: string }) {
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

// Halteres: ponto vazio = medição anterior, ponto cheio = atual, linha = 70%.
function Halteres({ antes, depois, rotulo }: { antes: number | null; depois: number | null; rotulo: string }) {
  if (antes === null || depois === null) {
    return (
      <div style={{ flex: "2 1 300px", fontSize: 14, color: C.secundario }} aria-label={`${rotulo}: aguardando as duas medições`}>
        Aguardando as duas medições
      </div>
    );
  }
  const lo = Math.min(antes, depois);
  const hi = Math.max(antes, depois);
  const d = sentido(depois - antes);
  return (
    <div style={{ flex: "2 1 300px", position: "relative", height: 28 }} role="img" aria-label={`${rotulo}: de ${fmtPct(antes)} para ${fmtPct(depois)}`}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 13, height: 2, background: C.linhaSuave, borderRadius: 2 }} />
      <div style={{ position: "absolute", left: "70%", top: 2, width: 2, height: 24, background: C.texto, opacity: 0.55 }} />
      <div
        style={{ position: "absolute", top: 12, height: 4, borderRadius: 4, background: d === "negativo" ? C.atencaoClaro : C.positivo, opacity: 0.35, left: `${lo}%`, width: `${hi - lo}%` }}
      />
      <div
        style={{ position: "absolute", top: 6, width: 16, height: 16, borderRadius: "50%", background: C.cartao, border: "3px solid #A3ADBA", boxSizing: "border-box", left: `calc(${antes}% - 8px)` }}
      />
      <div
        style={{ position: "absolute", top: 5, width: 18, height: 18, borderRadius: "50%", background: depois >= 70 ? C.positivo : C.atencaoClaro, boxShadow: `0 0 0 3px ${C.cartao}`, left: `calc(${depois}% - 9px)` }}
      />
    </div>
  );
}

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

// ---------- Página ----------

export function RelatorioFimCiclo() {
  const [modo, setModo] = useState<"SEBRAE" | "AREA">("SEBRAE");
  const [area, setArea] = useState<string>("");
  const [abaConhecimento, setAbaConhecimento] = useState<"TECNICO" | "COMPORTAMENTAL">("TECNICO");
  const [abaFortalezas, setAbaFortalezas] = useState<"SEBRAE" | "AREA">("SEBRAE");
  const [abaFoco, setAbaFoco] = useState<"SEBRAE" | "AREA">("SEBRAE");
  const [aberto, setAberto] = useState<string | null>(null);

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
  const consulta = api.fimDeCiclo.useQuery(unidade ? { unidade } : undefined, { refetchOnWindowFocus: false, keepPreviousData: true });
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
  const nomeRecorte = unidade ? nomeArea(unidade) : "Sebrae/TO · todas as áreas";

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

  const textoCrescimento = (destaques: any) =>
    destaques.sobem.length ? destaques.sobem.map((d: any) => `${d.nome} (${fmtDelta(d.delta)})`).join(" e ") : null;

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
            Esta área tem menos de 5 pessoas avaliadas: os resultados são amostra pequena e ficam fora de destaques e sínteses.
          </div>
        )}

        {/* Bloco 1 — Sobre este ciclo */}
        <Secao titulo="Sobre este ciclo" id="sobre">
          <Grade min={220} gap={12}>
            <Quadro rotulo="Pessoas avaliadas" valor={ctx.pessoas} detalhe={unidade ? nomeArea(unidade) : `${ctx.areas.length} ${ctx.areas.length === 1 ? "área" : "áreas"}`} />
            <Quadro
              rotulo="Período do ciclo"
              valor={<span style={{ fontSize: 18 }}>2025 a {mesAno(ctx.periodo.tecnico.fim)}</span>}
              detalhe={
                <>
                  Proficiência: 2025 (mês {ACARREGAR}) a {mesAno(ctx.periodo.tecnico.fim)}
                  <br />
                  Desempenho: {mesAno(ctx.periodo.comportamental.inicio)} a {mesAno(ctx.periodo.comportamental.fim)}
                </>
              }
            />
            <Quadro
              rotulo="Execução do PDI"
              valor={<span style={{ fontSize: 18 }}>{mesAno(ctx.execucao.inicio)} a {mesAno(ctx.execucao.fim)}</span>}
              detalhe="Período em que as ações foram realizadas"
            />
            <Quadro
              rotulo="Ações de PDI"
              valor={ctx.acoes.total}
              detalhe={`${ctx.acoes.concluidas} concluídas · ${ctx.acoes.emAndamento} em andamento · ${ctx.acoes.canceladas} canceladas`}
            />
          </Grade>
          <Grade min={320} gap={16}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Eixos técnicos avaliados</div>
                <div style={{ fontSize: 14, color: C.secundario }}>Avaliação de Proficiência 2025 → 2026 · {ctx.eixos.length} eixos</div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ctx.eixos.map((e: any) => (
                  <Chip key={e.nome} tipo={e.transversal ? "transversal" : "neutro"}>
                    {e.nome}
                    {e.transversal ? " · transversal" : ""}
                  </Chip>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Competências avaliadas</div>
                <div style={{ fontSize: 14, color: C.secundario }}>
                  Avaliação de Desempenho {adBase} → {adAtual} · {ctx.competencias.length} competências
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {ctx.competencias.map((c: any) => (
                  <Chip key={c.nome}>{c.nome}</Chip>
                ))}
              </div>
            </div>
          </Grade>
          <p style={{ margin: 0, fontSize: 14, color: C.secundario }}>
            Referência: 70% nos dois instrumentos. Cada avaliação é o resultado de uma pessoa em um eixo ou competência. Técnico e comportamental são lidos separadamente.
          </p>
        </Secao>

        {/* Bloco 2 — Resultado geral */}
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-labelledby="resultado">
          <h2 id="resultado" style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 22, fontWeight: 600 }}>
            Resultado geral
          </h2>
          <Grade min={280}>
            {[
              { titulo: "Conhecimento técnico", sub: "Proficiência 2025 → 2026", x: tec, rotulo: "das avaliações técnicas acima de 70%", tipo: "TECNICO" },
              { titulo: "Competências comportamentais", sub: `AD ${adBase} → ${adAtual}`, x: comp, rotulo: "das avaliações de competências acima de 70%", tipo: "COMPORTAMENTAL" },
            ].map((c) => {
              const cresc = textoCrescimento(c.x.destaques);
              const quedas = c.x.destaques.caem.map((d: any) => `${d.nome} (${fmtDelta(d.delta)})`).join(" e ");
              return (
                <article key={c.titulo} style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: C.secundario }}>{c.titulo}</span>
                    <span style={{ fontSize: 13, color: C.secundario }}>{c.sub}</span>
                  </div>
                  <div style={{ fontFamily: FONTE_TITULO, fontSize: "clamp(30px, 4vw, 38px)", fontWeight: 700, color: C.positivo }}>
                    {fmtPct(c.x.pctAcimaAntes)} → {fmtPct(c.x.pctAcimaDepois)}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{c.rotulo}</div>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: C.corpo }}>
                    Nota média: {fraseVariacao(c.x.mediaAntes, c.x.mediaDepois)}
                    {c.x.variacaoRelativa !== null && sentido(c.x.delta) !== "zero" ? ` (${fmtDelta(c.x.variacaoRelativa)}% em relação ao início)` : ""}. Base: {c.x.comparaveis} de {c.x.total} avaliações com as duas medições
                    {c.tipo === "TECNICO" && c.x.aguardando > 0 ? `; ${c.x.aguardando} aguardam a Avaliação de Proficiência 2026` : ""}
                    {c.x.primeiraMedicao > 0 ? `; ${c.x.primeiraMedicao} são primeira medição` : ""}.
                  </p>
                  {c.tipo === "TECNICO" ? (
                    cresc && <p style={{ margin: 0, fontSize: 15, color: C.corpo }}>Mais cresceram: {cresc}.</p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 15, color: C.corpo }}>
                      {cresc ? `Subiu ${cresc}. ` : ""}
                      {quedas ? `Caiu ${quedas}. ` : ""}Medido antes das ações do PDI.
                    </p>
                  )}
                </article>
              );
            })}
            <article style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.secundario }}>Onde focar no próximo ciclo</span>
                <span style={{ fontSize: 13, color: C.secundario }}>abaixo de 70%</span>
              </div>
              {[
                { titulo: "Conhecimentos técnicos", f: tec.ondeFocar },
                { titulo: "Competências", f: comp.ondeFocar },
              ].map((b) => (
                <div key={b.titulo} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{b.titulo}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {b.f.itens.length ? (
                      b.f.itens.map((i: any) => (
                        <Chip key={i.nome} tipo="foco">
                          {i.nome} · {i.abaixo}
                        </Chip>
                      ))
                    ) : (
                      <Chip tipo="vazio">Nenhum abaixo de 70% com 5 pessoas ou mais</Chip>
                    )}
                    {b.f.amostraPequena > 0 && <Chip tipo="vazio">+ {b.f.amostraPequena} com amostra pequena</Chip>}
                  </div>
                </div>
              ))}
              <p style={{ margin: 0, fontSize: 13, color: C.secundario }}>O número é de pessoas abaixo de 70% naquele eixo ou competência.</p>
            </article>
          </Grade>
          <Sintese texto={r.sinteses.resultado} />
        </section>

        {/* Bloco 3 — Como as avaliações fecharam o ciclo */}
        <Secao
          titulo="Como as avaliações fecharam o ciclo"
          subtitulo="Cada avaliação é o resultado de uma pessoa em um eixo técnico ou em uma competência, comparando a medição anterior com a atual."
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
                  {g === "ABAIXO" && tec.classes.EM_EVOLUCAO + comp.classes.EM_EVOLUCAO > 0 && (
                    <div style={{ fontSize: 13, color: C.secundario }}>{tec.classes.EM_EVOLUCAO + comp.classes.EM_EVOLUCAO} em evolução (subiram 10 pontos ou mais)</div>
                  )}
                  {g === "MANTEVE" && tec.classes.ATENCAO + comp.classes.ATENCAO > 0 && (
                    <div style={{ fontSize: 13, color: C.secundario }}>{tec.classes.ATENCAO + comp.classes.ATENCAO} com atenção (caíram 10 pontos ou mais)</div>
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
          subtitulo="Média por eixo, antes e depois, sobre as mesmas avaliações. Ordenado pelo número de pessoas avaliadas."
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 14, color: C.secundario, alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.cartao, border: "3px solid #A3ADBA" }} />
              {abaConhecimento === "TECNICO" ? "Avaliação de Proficiência 2025" : `Avaliação de Desempenho ${adBase}`}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: C.positivo }} />
              {abaConhecimento === "TECNICO" ? "Avaliação de Proficiência 2026" : `Avaliação de Desempenho ${adAtual}`}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 2, height: 14, background: C.texto }} />
              Referência 70%
            </span>
          </div>
          {abaConhecimento === "COMPORTAMENTAL" && (
            <p style={{ margin: 0, fontSize: 14, color: C.corpo }}>
              As ações do PDI vieram depois da AD {adAtual}; estes números são o ponto de partida do PDI comportamental. A nota da Avaliação de Desempenho (0 a 3) aparece em percentual da escala: nota 2,1 = 70%.
            </p>
          )}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {eixosAba.map((e: any) => {
              const chave = `${abaConhecimento}|${e.nome}`;
              const expandido = aberto === chave;
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
                        {e.transversal && abaConhecimento === "TECNICO" && <Etiqueta>transversal</Etiqueta>}
                        {e.amostraPequena && <Etiqueta>amostra pequena</Etiqueta>}
                      </div>
                    </div>
                    <Halteres antes={e.mediaAntes} depois={e.mediaDepois} rotulo={e.nome} />
                    <div style={{ flex: "0 0 170px", display: "flex", justifyContent: "flex-end", alignItems: "baseline", gap: 10, fontVariantNumeric: "tabular-nums" }}>
                      {e.mediaAntes !== null && e.mediaDepois !== null ? (
                        <>
                          <span style={{ fontSize: 14, color: C.secundario }}>
                            {fmtPct(e.mediaAntes)} → {fmtPct(e.mediaDepois)}
                          </span>
                          <span style={{ fontFamily: FONTE_TITULO, fontSize: 18, fontWeight: 700, minWidth: 56, textAlign: "right", color: corDelta(e.delta) }} aria-label={`variação de ${fmtDelta(e.delta)} pontos`}>
                            {fmtDelta(e.delta)}
                          </span>
                        </>
                      ) : (
                        <span style={{ fontSize: 14, color: C.secundario }}>{e.aguardando} aguardam medição</span>
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
                        Hoje: {e.nAtual} pessoas com a medição atual, média {fmtPct(e.mediaAtual)}; {e.abaixo} abaixo de 70%.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <Sintese texto={abaConhecimento === "TECNICO" ? r.sinteses.tecnico : r.sinteses.comportamental} />
        </Secao>

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
                  sub: "Pontos de partida abaixo de 70% (Proficiência 2025) que já têm plano",
                  x: r.pdi.planejamento.TECNICO.comPlano,
                  y: r.pdi.planejamento.TECNICO.total,
                },
                {
                  titulo: "Planejamento · competências",
                  sub: `Pontos de partida abaixo de 70% (AD ${adAtual}) que já têm plano`,
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
                  <div style={{ textAlign: "right", flex: "none" }}>
                    <div style={{ fontFamily: FONTE_TITULO, fontSize: 24, fontWeight: 700 }}>{l.y ? fmtPct((l.x / l.y) * 100) : "Nenhum"}</div>
                    <div style={{ fontSize: 13, color: C.secundario }}>
                      {l.x} de {l.y}
                    </div>
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
                        {s.chegaram} de {s.total} avaliações com ação chegaram a 70%
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 15, color: C.tealTexto }}>Ainda não há área com 5 ou mais avaliações técnicas que partiram de abaixo de 70% e tiveram ação concluída antes da nova medição.</div>
                )}
                {r.pdi.areasAmostraPequena > 0 && (
                  <div style={{ fontSize: 13, color: "#2E5555" }}>{r.pdi.areasAmostraPequena} área(s) com menos de 5 avaliações nessa condição ficam fora da lista.</div>
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
                  vezes em que uma pessoa tirou 70% ou mais em um eixo técnico que não é exigido na sua função, em {r.fortalezas.multiplicadores.eixos} eixos. É conhecimento que ela pode ensinar a quem precisa.
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
              {abaFortalezas === "SEBRAE" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 14, color: C.secundario, paddingBottom: 6 }}>Conhecimentos comuns a todos, onde a força é da organização. Média atual entre quem já tem a medição.</div>
                  {r.fortalezas.transversais.length ? (
                    r.fortalezas.transversais.map((t: any) => (
                      <div key={t.nome} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.linhaSuave}` }}>
                        <span>
                          <strong>{t.nome}</strong> <span style={{ color: C.secundario }}>· {t.pessoas} pessoas</span>
                        </span>
                        <strong>{fmtPct(t.media)}</strong>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 15, color: C.secundario }}>Nenhum eixo transversal com medição de 5 pessoas ou mais neste recorte.</div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ fontSize: 14, color: C.secundario, paddingBottom: 6 }}>Conhecimentos específicos de cada área, com no mínimo 5 pessoas.</div>
                  {r.fortalezas.porArea.length ? (
                    r.fortalezas.porArea.flatMap((a: any) =>
                      a.eixos.map((e: any) => (
                        <div key={`${a.area}|${e.nome}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "10px 0", borderBottom: `1px solid ${C.linhaSuave}` }}>
                          <span>
                            <span style={{ color: C.secundario }}>{nomeArea(a.area).split(" · ")[0]} · </span>
                            <strong>{e.nome}</strong> <span style={{ color: C.secundario }}>· {e.pessoas} pessoas</span>
                          </span>
                          <strong>{fmtPct(e.media)}</strong>
                        </div>
                      )),
                    )
                  ) : (
                    <div style={{ fontSize: 15, color: C.secundario }}>Nenhum eixo específico com medição de 5 pessoas ou mais neste recorte.</div>
                  )}
                </div>
              )}
            </article>
          </Grade>
          <Sintese texto={r.sinteses.pdi} />
        </section>

        {/* Bloco 6 — Foco de desenvolvimento do próximo ciclo */}
        <Secao
          titulo="Foco de desenvolvimento do próximo ciclo"
          subtitulo="Os eixos e competências em que investir para a empresa crescer como um todo."
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
          {abaFoco === "SEBRAE" ? (
            <Grade min={320}>
              <ColunaFoco titulo="Eixos técnicos transversais" itens={r.foco.sebrae.tecnicos} vazio="Nenhum eixo transversal com pessoas abaixo de 70% ou com queda." />
              <ColunaFoco titulo="Competências comportamentais" itens={r.foco.sebrae.competencias} vazio="Nenhuma competência com pessoas abaixo de 70% ou com queda." />
            </Grade>
          ) : r.foco.porArea.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {r.foco.porArea.map((a: any) => (
                <div key={a.area} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{nomeArea(a.area)}</div>
                  <Grade min={320}>
                    <ColunaFoco titulo="Eixos técnicos específicos" itens={a.tecnicos} vazio="Nenhum eixo específico com 5 pessoas ou mais nesta condição." />
                    <ColunaFoco titulo="Competências" itens={a.competencias} vazio="Nenhuma competência com 5 pessoas ou mais nesta condição." />
                  </Grade>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>Eixos específicos de cada área entram aqui, com no mínimo 5 pessoas por eixo. Nenhum atende ao critério neste recorte.</p>
          )}
          <p style={{ margin: 0, fontSize: 13, color: C.secundario }}>
            Critério: eixos transversais e competências com mais pessoas abaixo de 70% ou com queda no ciclo (por área: eixos específicos). Pessoas = quem já tem a medição atual.
          </p>
        </Secao>

        {/* Bloco 7 — Quanto investimos onde mais crescemos */}
        <Secao titulo="Quanto investimos onde mais crescemos" subtitulo="Número médio de ações do PDI por pessoa, comparado ao crescimento de cada eixo e competência." id="investimento">
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ textAlign: "left", color: C.secundario, fontSize: 13 }}>
                  {["Eixo ou competência", "Pessoas", "Crescimento (pontos)", "Ações de PDI por pessoa", "% de pessoas com ação"].map((h, i) => (
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
                          {l.tipo === "TECNICO" ? "Técnico" : "Comportamental"}
                          {l.contraste ? " · para comparar" : ""}
                        </div>
                      </td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}` }}>{l.pessoas}</td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right", fontWeight: 700, color: corDelta(l.crescimento) }}>{fmtDelta(l.crescimento)}</td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right" }}>{fmtNum(l.acoesPorPessoa)}</td>
                      <td style={{ padding: "14px 12px", borderBottom: `1px solid ${C.linhaSuave}`, textAlign: "right" }}>{fmtPct(l.pctComAcao)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} style={{ padding: "14px 12px", color: C.secundario }}>
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
              <strong>Avaliação</strong> é o resultado de uma pessoa em um eixo técnico ou em uma competência.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Ponto de partida</strong> é a primeira medição de cada avaliação. Só existe evolução quando há uma nova medição para comparar; a primeira medição não conta como evolução.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Referência de 70%</strong> é a linha de corte usada nos dois instrumentos. Técnico e comportamental nunca são somados. Na Avaliação de Desempenho, a nota de 0 a 3 é lida em percentual da escala (nota 2,1 = 70%).
            </p>
            <p style={{ margin: 0 }}>
              <strong>Variação</strong> é a diferença, em pontos na escala de 0 a 100%, entre a média anterior e a atual, calculadas sobre as mesmas avaliações (as que têm as duas medições).
            </p>
            <p style={{ margin: 0 }}>
              <strong>Classificações:</strong> já acima de 70% e manteve; chegou a 70% neste ciclo; em evolução (abaixo de 70%, mas subiu {r.parametros.limiarEvolucaoPontos} pontos ou mais); abaixo de 70%; atenção (acima de 70%, mas caiu {r.parametros.limiarAtencaoPontos} pontos ou mais); primeira medição; aguardando medição.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Amostra pequena</strong> marca eixos com menos de {r.parametros.amostraMinima} pessoas com as duas medições; esses resultados não entram em destaques nem sínteses.
            </p>
            <p style={{ margin: 0 }}>
              <strong>Multiplicadores:</strong> vezes em que uma pessoa tirou 70% ou mais em um eixo técnico que não é exigido na sua função — conhecimento que ela pode ensinar.
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

function ColunaFoco({ titulo, itens, vazio }: { titulo: string; itens: any[]; vazio: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 22, borderRadius: 16, background: C.cinzaClaro }}>
      <div style={{ fontWeight: 700, fontSize: 17 }}>{titulo}</div>
      {itens.length ? (
        itens.map((i) => (
          <div key={i.nome} style={{ display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px", borderRadius: 12, background: C.cartao }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <strong>{i.nome}</strong>
              {i.delta !== null && (
                <span style={{ fontSize: 14, fontWeight: 700, color: corDelta(i.delta) }} aria-label={`variação de ${fmtDelta(i.delta)} pontos`}>
                  {fmtDelta(i.delta)} pontos
                </span>
              )}
            </div>
            <div style={{ fontSize: 14, color: C.secundario }}>
              {i.pessoas} pessoas · média {fmtPct(i.media)} · {i.abaixo} abaixo de 70%
            </div>
            <div style={{ fontSize: 14, color: C.corpo }}>{i.motivo}</div>
          </div>
        ))
      ) : (
        <div style={{ fontSize: 15, color: C.secundario }}>{vazio}</div>
      )}
    </div>
  );
}
