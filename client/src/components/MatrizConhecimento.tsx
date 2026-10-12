import React, { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { CONCEITOS, ROTULO_CONCEITO, type Conceito } from "../../../shared/fimDeCicloRegras";
import { Abas, C, COR_CONCEITO, FONTE_TEXTO, FONTE_TITULO, Secao, nomeArea } from "./fimCicloEstilo";

// Matriz de Conhecimento: onde está cada conhecimento.
// - Por área: vai no relatório da diretoria, sem nomes.
// - Por empregado: só administradores, numa aba separada (tem nomes).

const api = (trpc as any).evolucaoCiclo;

type Grupo = "T" | "L" | "E";
type Coluna = { chave?: string; nome: string; grupo: Grupo; pessoas: number };

const SIGLA: Record<Conceito, string> = {
  EM_DESENVOLVIMENTO: "ED",
  APLICADO: "CA",
  CONSOLIDADO: "CC",
  AVANCADO: "AV",
  REFERENCIA: "RE",
};
const TEXTO_CLARO = new Set<Conceito>(["CONSOLIDADO", "AVANCADO", "REFERENCIA"]);
const corTexto = (c: Conceito) => (TEXTO_CLARO.has(c) ? "#FFFFFF" : C.texto);

const ROTULO_GRUPO_TEC: Record<Grupo, string> = { T: "Transversais · todo o Sebrae", L: "Liderança · líderes", E: "Essenciais · por área" };
const ROTULO_GRUPO_COMP: Record<Grupo, string> = { T: "Transversal", L: "", E: "Demais competências" };
const FUNDO_GRUPO: Record<Grupo, string> = { T: C.transvFundo, L: "#ECE6F6", E: C.linhaSuave };

const LARGURA_CELULA = 52;

// Cabeçalho em duas linhas: grupo (transversais | liderança | essenciais) e nome do eixo na vertical.
function Cabecalho({ colunas, rotulos, primeira }: { colunas: Coluna[]; rotulos: Record<Grupo, string>; primeira: string }) {
  const grupos: Array<{ g: Grupo; n: number }> = [];
  for (const c of colunas) {
    const ult = grupos[grupos.length - 1];
    if (ult && ult.g === c.grupo) ult.n += 1;
    else grupos.push({ g: c.grupo, n: 1 });
  }
  const fixa: React.CSSProperties = { position: "sticky", left: 0, zIndex: 2, background: C.cartao };
  return (
    <thead>
      <tr>
        <th style={{ ...fixa, minWidth: 220 }} />
        {grupos.map((g, i) => (
          <th
            key={i}
            colSpan={g.n}
            scope="colgroup"
            style={{ background: FUNDO_GRUPO[g.g], fontSize: 11, fontWeight: 700, color: C.corpo, padding: "6px 6px", textAlign: "left", borderLeft: `3px solid ${C.cartao}`, lineHeight: 1.25, verticalAlign: "bottom" }}
          >
            {rotulos[g.g]}
          </th>
        ))}
      </tr>
      <tr>
        <th scope="col" style={{ ...fixa, textAlign: "left", verticalAlign: "bottom", padding: "8px 12px 8px 0", fontSize: 13, color: C.secundario, fontWeight: 600 }}>
          {primeira}
        </th>
        {colunas.map((c, i) => (
          <th
            key={c.chave ?? c.nome}
            scope="col"
            title={c.nome}
            style={{
              width: LARGURA_CELULA,
              minWidth: LARGURA_CELULA,
              height: 170,
              verticalAlign: "bottom",
              padding: "6px 0",
              borderLeft: i > 0 && colunas[i - 1].grupo !== c.grupo ? `3px solid ${C.cartao}` : undefined,
            }}
          >
            <div style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", fontSize: 13, fontWeight: 600, color: C.texto, lineHeight: 1.2, maxHeight: 165, overflow: "hidden", margin: "0 auto", textAlign: "left" }}>
              {c.nome}
            </div>
          </th>
        ))}
      </tr>
    </thead>
  );
}

function Moldura({ children, rotulo }: { children: React.ReactNode; rotulo: string }) {
  return (
    <div role="region" aria-label={rotulo} tabIndex={0} style={{ overflowX: "auto", border: `1px solid ${C.borda}`, borderRadius: 14, maxWidth: "100%" }}>
      {children}
    </div>
  );
}

const estiloTabela: React.CSSProperties = { borderCollapse: "separate", borderSpacing: "0 4px", fontSize: 14, fontVariantNumeric: "tabular-nums", padding: "0 12px 8px" };

// ---------- Por área (relatório da diretoria) ----------

function CelulaArea({ c, eixo, area }: { c: any; eixo: string; area: string }) {
  if (!c) return <td style={{ textAlign: "center", color: C.neutro }} aria-label={`${area}, ${eixo}: não avaliado`}>·</td>;
  if (c.amostraPequena) {
    return (
      <td title={`${eixo}: menos de 5 pessoas medidas`} style={{ padding: 2 }}>
        <div
          style={{
            height: 40,
            borderRadius: 8,
            background: `repeating-linear-gradient(45deg, ${C.linhaSuave}, ${C.linhaSuave} 4px, ${C.cartao} 4px, ${C.cartao} 8px)`,
            border: `1px solid ${C.borda}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: C.secundario,
          }}
        >
          {"<5"}
        </div>
      </td>
    );
  }
  const p = c.metade as Conceito;
  return (
    <td title={`${eixo}: pelo menos metade em ${ROTULO_CONCEITO[p]} ou acima; ${c.naExpectativa} de ${c.medidas} na expectativa`} style={{ padding: 2 }}>
      <div
        style={{
          height: 40,
          borderRadius: 8,
          background: COR_CONCEITO[p],
          color: corTexto(p),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1.1,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700 }}>{SIGLA[p]}</span>
        <span style={{ fontSize: 11 }}>
          {c.naExpectativa}/{c.medidas}
        </span>
      </div>
    </td>
  );
}

export function MatrizPorArea({ matriz }: { matriz: any }) {
  const [aba, setAba] = useState<"TECNICO" | "COMPORTAMENTAL">("TECNICO");
  const m = matriz[aba];
  const rotulos = aba === "TECNICO" ? ROTULO_GRUPO_TEC : ROTULO_GRUPO_COMP;
  const linhas = [{ area: "Sebrae · todas as áreas", total: true, ...m.total }, ...m.linhas];
  return (
    <Secao
      titulo="Matriz de conhecimento por área"
      subtitulo="Onde está cada conhecimento hoje: o conceito que pelo menos metade de cada área alcançou e quantas pessoas estão na expectativa de desenvolvimento. Medição atual."
      id="matriz"
      acao={
        <Abas
          rotulo="Instrumento da matriz"
          valor={aba}
          onChange={setAba}
          opcoes={[
            ["TECNICO", "Técnico"],
            ["COMPORTAMENTAL", "Comportamental"],
          ]}
        />
      }
    >
      <LegendaMatriz />
      {m.colunas.length ? (
        <Moldura rotulo="Matriz de conhecimento por área">
          <table style={estiloTabela}>
            <Cabecalho colunas={m.colunas} rotulos={rotulos} primeira="Área" />
            <tbody>
              {linhas.map((l: any) => (
                <tr key={l.area}>
                  <th
                    scope="row"
                    style={{ position: "sticky", left: 0, zIndex: 1, background: l.total ? C.cinzaClaro : C.cartao, textAlign: "left", padding: "4px 12px 4px 8px", fontWeight: l.total ? 700 : 600, fontSize: 14, borderRadius: 8 }}
                  >
                    <div>{l.total ? l.area : nomeArea(l.area)}</div>
                    <div style={{ fontSize: 12, color: C.secundario, fontWeight: 400 }}>{l.pessoas} pessoas</div>
                  </th>
                  {m.colunas.map((c: Coluna) => (
                    <CelulaArea key={c.chave} c={l.celulas[c.chave!]} eixo={c.nome} area={l.area} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Moldura>
      ) : (
        <div style={{ fontSize: 15, color: C.secundario }}>Nenhuma avaliação neste recorte.</div>
      )}
    </Secao>
  );
}

function LegendaMatriz({ empregado = false }: { empregado?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px", fontSize: 14, color: C.secundario }}>
        {CONCEITOS.map((c) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ minWidth: 26, height: 20, padding: "0 4px", borderRadius: 5, background: COR_CONCEITO[c], color: corTexto(c), fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              {SIGLA[c]}
            </span>
            {ROTULO_CONCEITO[c]}
          </span>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: C.secundario }}>
        {empregado
          ? "Conceito na medição atual. Borda tracejada: eixo não essencial na função (conhecimento que a pessoa pode ensinar). Célula clara com relógio: aguardando a medição atual, mostra o conceito anterior. Clique no nome para ver o detalhe."
          : "Sigla = conceito que pelo menos metade das pessoas da área alcançou ou superou; número = pessoas na expectativa (Conhecimento Aplicado ou acima) de quantas têm a medição atual. “<5”: menos de 5 pessoas medidas, o conceito não é exibido. “·”: eixo não avaliado na área."}
      </p>
    </div>
  );
}

// ---------- Por empregado (só administradores) ----------

const ROTULO_RELACAO = { TRANSVERSAL: "transversal", ESSENCIAL: "essencial", NAO_ESSENCIAL: "não essencial" } as const;
type Publico = "TODOS" | "LIDERES" | "DEMAIS";

function CelulaPessoa({ c, eixo }: { c: any; eixo: string }) {
  if (!c) return <td style={{ textAlign: "center", color: C.neutro }}>·</td>;
  const atual = c.depois as Conceito | null;
  const anterior = c.antes as Conceito | null;
  const mostrado = atual ?? anterior;
  const naoEssencial = c.relacao === "NAO_ESSENCIAL";
  const titulo = `${eixo}${c.relacao ? ` (${ROTULO_RELACAO[c.relacao as keyof typeof ROTULO_RELACAO]})` : ""}: ${
    atual ? ROTULO_CONCEITO[atual] : "aguardando a medição atual"
  }${anterior ? ` · antes: ${ROTULO_CONCEITO[anterior]}` : ""}`;
  if (!mostrado) return <td style={{ textAlign: "center", color: C.neutro }}>·</td>;
  return (
    <td title={titulo} style={{ padding: 2 }}>
      <div
        style={{
          height: 32,
          borderRadius: 7,
          background: COR_CONCEITO[mostrado],
          color: corTexto(mostrado),
          opacity: atual ? 1 : 0.4,
          outline: naoEssencial ? `2px dashed ${C.texto}` : undefined,
          outlineOffset: -3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {SIGLA[mostrado]}
        {!atual && <span aria-hidden="true">&nbsp;⏱</span>}
      </div>
    </td>
  );
}

function Detalhe({ l, colunas, ad }: { l: any; colunas: any; ad: any }) {
  const item = (nome: string, c: any, relacao?: string) => (
    <li key={nome} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "baseline" }}>
      <strong style={{ fontWeight: 600 }}>{nome}</strong>
      {relacao && <span style={{ color: C.secundario, fontSize: 13 }}>· {relacao}</span>}
      <span style={{ color: C.corpo }}>
        — {c.antes ? ROTULO_CONCEITO[c.antes as Conceito] : "sem medição anterior"} → {c.depois ? ROTULO_CONCEITO[c.depois as Conceito] : "aguardando medição"}
      </span>
    </li>
  );
  const tec = (colunas.TECNICO as Coluna[]).filter((c) => l.tecnico[c.nome]);
  const comp = (colunas.COMPORTAMENTAL as Coluna[]).filter((c) => l.comportamental[c.nome]);
  return (
    <div style={{ padding: 16, borderRadius: 12, background: C.cinzaClaro, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))", gap: 16, fontSize: 14 }}>
      <div>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Eixos técnicos · Proficiência 2025 → 2026</div>
        <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
          {tec.map((c) => item(c.nome, l.tecnico[c.nome], ROTULO_RELACAO[l.tecnico[c.nome].relacao as keyof typeof ROTULO_RELACAO]))}
        </ul>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Competências · AD {ad.anoBase ?? "[a carregar]"} → {ad.anoAtual ?? "[a carregar]"}
          </div>
          {comp.length ? (
            <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>{comp.map((c) => item(c.nome, l.comportamental[c.nome]))}</ul>
          ) : (
            <div style={{ color: C.secundario }}>Sem Avaliação de Desempenho.</div>
          )}
        </div>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>PDI</div>
          <div style={{ color: C.corpo }}>
            {l.acoes.ativas} {l.acoes.ativas === 1 ? "ação" : "ações"} no PDI · {l.acoes.concluidas} {l.acoes.concluidas === 1 ? "concluída" : "concluídas"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatrizEmpregados() {
  const [area, setArea] = useState("");
  const [publico, setPublico] = useState<Publico>("TODOS");
  const [aba, setAba] = useState<"TECNICO" | "COMPORTAMENTAL">("TECNICO");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);

  const filtro = { ...(area ? { unidade: area } : {}), ...(publico !== "TODOS" ? { publico } : {}) };
  const consulta = api.matrizEmpregados.useQuery(Object.keys(filtro).length ? filtro : undefined, { refetchOnWindowFocus: false, keepPreviousData: true });
  const r: any = consulta.data;

  const linhas = useMemo(() => {
    if (!r) return [];
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    const chave = aba === "TECNICO" ? "tecnico" : "comportamental";
    return r.linhas.filter((l: any) => Object.keys(l[chave]).length && (!termo || l.nome.toLocaleLowerCase("pt-BR").includes(termo)));
  }, [r, busca, aba]);

  if (consulta.isLoading && !r) return <div style={{ padding: 32, fontFamily: FONTE_TEXTO, color: C.secundario }}>Carregando a matriz de conhecimento…</div>;
  if (consulta.isError || !r) {
    return (
      <div style={{ padding: 24, borderRadius: 16, background: C.focoFundo, color: C.focoTexto, fontFamily: FONTE_TEXTO }}>
        Não foi possível carregar a matriz. {consulta.error?.message ?? ""}
      </div>
    );
  }

  const colunas: Coluna[] = r.colunas[aba];
  const rotulos = aba === "TECNICO" ? { T: "Transversais · todo o Sebrae", L: "Liderança · líderes", E: "Demais eixos · por área" } : ROTULO_GRUPO_COMP;
  const campo: React.CSSProperties = { minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, padding: "0 12px", fontFamily: "inherit", fontSize: 15, background: C.cartao, maxWidth: "100%" };

  return (
    <div style={{ fontFamily: FONTE_TEXTO, color: C.texto, background: C.fundo, borderRadius: 20 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 48px", display: "flex", flexDirection: "column", gap: 20 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secundario }}>Só administradores · contém nomes</div>
          <h1 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700 }}>Matriz de conhecimento por empregado</h1>
          <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>
            O conceito de cada pessoa em cada eixo e competência. Use para encontrar quem pode ensinar e quem precisa desenvolver. Resultados individuais: não compartilhar fora da gestão (LGPD e NR-1).
          </p>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
            <span style={{ color: C.secundario }}>Área</span>
            <select value={area} onChange={(e) => setArea(e.target.value)} style={campo}>
              <option value="">Todas as áreas</option>
              {(r.unidades as string[]).map((u) => (
                <option key={u} value={u}>
                  {nomeArea(u)}
                </option>
              ))}
            </select>
          </label>
          <Abas
            rotulo="Público"
            valor={publico}
            onChange={setPublico}
            opcoes={[
              ["TODOS", "Todos"],
              ["LIDERES", "Líderes"],
              ["DEMAIS", "Demais empregados"],
            ]}
          />
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar empregado" aria-label="Buscar empregado" style={{ ...campo, minWidth: 220 }} />
          {consulta.isFetching && <span style={{ fontSize: 14, color: C.secundario }}>Atualizando…</span>}
        </div>

        <section style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: "clamp(16px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Abas
              rotulo="Instrumento"
              valor={aba}
              onChange={setAba}
              opcoes={[
                ["TECNICO", "Técnico"],
                ["COMPORTAMENTAL", "Comportamental"],
              ]}
            />
            <span style={{ fontSize: 14, color: C.secundario }}>
              {linhas.length} {linhas.length === 1 ? "empregado" : "empregados"}
            </span>
          </div>
          <LegendaMatriz empregado />
          {linhas.length ? (
            <Moldura rotulo="Matriz de conhecimento por empregado">
              <table style={estiloTabela}>
                <Cabecalho colunas={colunas} rotulos={rotulos as Record<Grupo, string>} primeira="Empregado" />
                <tbody>
                  {linhas.map((l: any) => {
                    const expandido = aberto === l.id;
                    const celulas = aba === "TECNICO" ? l.tecnico : l.comportamental;
                    return (
                      <React.Fragment key={l.id}>
                        <tr>
                          <th scope="row" style={{ position: "sticky", left: 0, zIndex: 1, background: C.cartao, textAlign: "left", padding: "2px 12px 2px 0", minWidth: 220 }}>
                            <button
                              type="button"
                              aria-expanded={expandido}
                              onClick={() => setAberto(expandido ? null : l.id)}
                              style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", minHeight: 36, color: C.texto }}
                            >
                              <div style={{ fontWeight: 600, fontSize: 14 }}>
                                {l.nome} <span aria-hidden="true" style={{ color: C.secundario, fontSize: 11 }}>{expandido ? "▲" : "▼"}</span>
                              </div>
                              <div style={{ fontSize: 12, color: C.secundario, fontWeight: 400 }}>
                                {nomeArea(l.unidade).split(" · ")[0]}
                                {l.lider ? " · líder" : ""}
                              </div>
                            </button>
                          </th>
                          {colunas.map((c) => (
                            <CelulaPessoa key={c.nome} c={celulas[c.nome]} eixo={c.nome} />
                          ))}
                        </tr>
                        {expandido && (
                          <tr>
                            <td colSpan={colunas.length + 1} style={{ padding: "4px 0 12px" }}>
                              <div style={{ position: "sticky", left: 0, maxWidth: "min(1100px, 90vw)" }}>
                                <Detalhe l={l} colunas={r.colunas} ad={r.ad} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </Moldura>
          ) : (
            <div style={{ fontSize: 15, color: C.secundario }}>Nenhum empregado neste filtro.</div>
          )}
        </section>
      </div>
    </div>
  );
}

