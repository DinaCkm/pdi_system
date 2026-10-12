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

type TipoFiltro = "T" | "L" | "E" | "COMP";

function Botao({ children, onClick, primario = false }: { children: React.ReactNode; onClick: () => void; primario?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 44,
        padding: "0 18px",
        borderRadius: 10,
        border: primario ? "none" : `1px solid ${C.borda}`,
        background: primario ? C.positivo : C.cartao,
        color: primario ? "#FFFFFF" : C.texto,
        fontFamily: "inherit",
        fontSize: 15,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

const campo: React.CSSProperties = { minHeight: 44, borderRadius: 10, border: `1px solid ${C.borda}`, padding: "0 12px", fontFamily: "inherit", fontSize: 15, background: C.cartao, maxWidth: "100%" };

function Rotulado({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, color: C.secundario, fontWeight: 600, minWidth: 0 }}>
      {rotulo}
      {children}
    </label>
  );
}

export function MatrizPorArea({ matriz }: { matriz: any }) {
  const [aberta, setAberta] = useState(false);
  const [tipo, setTipo] = useState<TipoFiltro>("T");
  const [area, setArea] = useState("");
  const inst = tipo === "COMP" ? "COMPORTAMENTAL" : "TECNICO";
  const m = matriz[inst];
  const colunas: Coluna[] = tipo === "COMP" ? m.colunas : m.colunas.filter((c: Coluna) => c.grupo === tipo);
  const rotulos = tipo === "COMP" ? ROTULO_GRUPO_COMP : ROTULO_GRUPO_TEC;
  const linhas = area ? m.linhas.filter((l: any) => l.area === area) : [{ area: "Sebrae · todas as áreas", total: true, ...m.total }, ...m.linhas];
  const areas: string[] = matriz.TECNICO.linhas.map((l: any) => l.area);
  return (
    <Secao
      titulo="Matriz de conhecimento por área"
      subtitulo="Para cada área, o conceito que pelo menos metade das pessoas já alcançou em cada eixo. Medição atual, sem nomes."
      id="matriz"
      acao={<Botao onClick={() => setAberta(!aberta)} primario={!aberta}>{aberta ? "Fechar matriz" : "Abrir matriz"}</Botao>}
    >
      {aberta && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
            <Abas
              rotulo="Tipo de eixo"
              valor={tipo}
              onChange={setTipo}
              opcoes={[
                ["T", "Transversais"],
                ["L", "Liderança"],
                ["E", "Essenciais"],
                ["COMP", "Competências"],
              ]}
            />
            <Rotulado rotulo="Área">
              <select value={area} onChange={(e) => setArea(e.target.value)} style={campo}>
                <option value="">Todas as áreas</option>
                {areas.map((a) => (
                  <option key={a} value={a}>
                    {nomeArea(a)}
                  </option>
                ))}
              </select>
            </Rotulado>
          </div>
          <LegendaMatriz />
          {colunas.length ? (
            <Moldura rotulo="Matriz de conhecimento por área">
              <table style={estiloTabela}>
                <Cabecalho colunas={colunas} rotulos={rotulos} primeira="Área" />
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
                      {colunas.map((c: Coluna) => (
                        <CelulaArea key={c.chave} c={l.celulas[c.chave!]} eixo={c.nome} area={l.area} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Moldura>
          ) : (
            <div style={{ fontSize: 15, color: C.secundario }}>Nenhum eixo deste tipo neste recorte.</div>
          )}
        </>
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

type FiltroConceito = "TODOS" | "ED" | "EXPECTATIVA" | "FORTES";
const passaConceito = (f: FiltroConceito, c: Conceito | null | undefined) =>
  f === "TODOS" ||
  (f === "ED" && c === "EM_DESENVOLVIMENTO") ||
  (f === "EXPECTATIVA" && !!c && c !== "EM_DESENVOLVIMENTO") ||
  (f === "FORTES" && (c === "AVANCADO" || c === "REFERENCIA"));

const ORDEM_LISTA: Conceito[] = ["REFERENCIA", "AVANCADO", "CONSOLIDADO", "APLICADO", "EM_DESENVOLVIMENTO"];

export function MatrizEmpregados() {
  const [area, setArea] = useState("");
  const [publico, setPublico] = useState<Publico>("TODOS");
  const [tipo, setTipo] = useState<TipoFiltro>("T");
  const [eixo, setEixo] = useState("");
  const [conceito, setConceito] = useState<FiltroConceito>("TODOS");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);

  const filtro = { ...(area ? { unidade: area } : {}), ...(publico !== "TODOS" ? { publico } : {}) };
  const consulta = api.matrizEmpregados.useQuery(Object.keys(filtro).length ? filtro : undefined, { refetchOnWindowFocus: false, keepPreviousData: true });
  const r: any = consulta.data;

  const inst = tipo === "COMP" ? "COMPORTAMENTAL" : "TECNICO";
  const chave = tipo === "COMP" ? "comportamental" : "tecnico";
  const colunas: Coluna[] = useMemo(() => {
    if (!r) return [];
    const todas: Coluna[] = r.colunas[inst];
    return tipo === "COMP" ? todas : todas.filter((c) => c.grupo === tipo);
  }, [r, inst, tipo]);

  const termo = busca.trim().toLocaleLowerCase("pt-BR");
  // A área e o público também são aplicados aqui, para a tela nunca mostrar dados de um filtro anterior.
  const pessoas = useMemo(
    () =>
      r
        ? r.linhas.filter(
            (l: any) =>
              (!area || l.unidade === area) &&
              (publico === "TODOS" || (publico === "LIDERES" ? l.lider : !l.lider)) &&
              (!termo || l.nome.toLocaleLowerCase("pt-BR").includes(termo)),
          )
        : [],
    [r, termo, area, publico],
  );

  if (consulta.isLoading && !r) return <div style={{ padding: 32, fontFamily: FONTE_TEXTO, color: C.secundario }}>Carregando a matriz de conhecimento…</div>;
  if (consulta.isError || !r) {
    return (
      <div style={{ padding: 24, borderRadius: 16, background: C.focoFundo, color: C.focoTexto, fontFamily: FONTE_TEXTO }}>
        Não foi possível carregar a matriz. {consulta.error?.message ?? ""}
      </div>
    );
  }

  const eixoValido = eixo && colunas.some((c) => c.nome === eixo) ? eixo : "";
  const modo: "EIXO" | "GRADE" | "INICIO" = eixoValido ? "EIXO" : area || termo ? "GRADE" : "INICIO";
  const nomeTipo = { T: "eixo transversal", L: "eixo de liderança", E: "eixo", COMP: "competência" }[tipo];
  const pessoaAberta = aberto ? r.linhas.find((l: any) => l.id === aberto) : null;

  // Grade: só pessoas que têm algum eixo do tipo escolhido e passam no filtro de conceito.
  const linhasGrade = pessoas.filter((l: any) => colunas.some((c) => l[chave][c.nome] && passaConceito(conceito, l[chave][c.nome].depois)));

  // Por eixo: pessoas agrupadas pelo conceito atual.
  const comEixo = eixoValido ? pessoas.filter((l: any) => l[chave][eixoValido]) : [];
  const porConceito = ORDEM_LISTA.filter((c) => passaConceito(conceito, c)).map((c) => ({ c, l: comEixo.filter((p: any) => p[chave][eixoValido].depois === c) }));
  const aguardando = conceito === "TODOS" ? comEixo.filter((p: any) => !p[chave][eixoValido].depois) : [];

  const botaoNome = (l: any, compacto = false) => (
    <button
      type="button"
      onClick={() => setAberto(aberto === l.id ? null : l.id)}
      aria-pressed={aberto === l.id}
      style={{ background: aberto === l.id ? C.tealFundo : "none", border: "none", borderRadius: 8, padding: compacto ? "4px 6px" : 0, cursor: "pointer", fontFamily: "inherit", textAlign: "left", minHeight: compacto ? 32 : 36, color: C.texto }}
    >
      <span style={{ fontWeight: 600, fontSize: 14 }}>{l.nome}</span>{" "}
      <span style={{ fontSize: 12, color: C.secundario }}>
        {nomeArea(l.unidade).split(" · ")[0]}
        {l.lider ? " · líder" : ""}
      </span>
    </button>
  );

  return (
    <div style={{ fontFamily: FONTE_TEXTO, color: C.texto, background: C.fundo, borderRadius: 20 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 48px", display: "flex", flexDirection: "column", gap: 20 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secundario }}>Só administradores · contém nomes</div>
          <h1 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700 }}>Matriz de conhecimento</h1>
          <p style={{ margin: 0, fontSize: 15, color: C.secundario }}>
            Escolha um eixo para ver quem está em cada conceito, ou uma área para ver a equipe. Resultados individuais: não compartilhar fora da gestão (LGPD e NR-1).
          </p>
        </header>

        <section style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: "clamp(16px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 16 }}>
          <Abas
            rotulo="Tipo de eixo"
            valor={tipo}
            onChange={(v) => {
              setTipo(v);
              setEixo("");
            }}
            opcoes={[
              ["T", "Transversais"],
              ["L", "Liderança"],
              ["E", "Essenciais e demais"],
              ["COMP", "Competências"],
            ]}
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 12 }}>
            <Rotulado rotulo={tipo === "COMP" ? "Competência" : "Eixo"}>
              <select value={eixoValido} onChange={(e) => setEixo(e.target.value)} style={campo}>
                <option value="">{tipo === "COMP" ? "Todas as competências" : "Todos os eixos deste tipo"}</option>
                {colunas.map((c) => (
                  <option key={c.nome} value={c.nome}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Rotulado>
            <Rotulado rotulo="Área">
              <select value={area} onChange={(e) => setArea(e.target.value)} style={campo}>
                <option value="">Todas as áreas</option>
                {(r.unidades as string[]).map((u) => (
                  <option key={u} value={u}>
                    {nomeArea(u)}
                  </option>
                ))}
              </select>
            </Rotulado>
            <Rotulado rotulo="Público">
              <select value={publico} onChange={(e) => setPublico(e.target.value as Publico)} style={campo}>
                <option value="TODOS">Todos</option>
                <option value="LIDERES">Líderes</option>
                <option value="DEMAIS">Demais empregados</option>
              </select>
            </Rotulado>
            <Rotulado rotulo="Conceito atual">
              <select value={conceito} onChange={(e) => setConceito(e.target.value as FiltroConceito)} style={campo}>
                <option value="TODOS">Todos</option>
                <option value="FORTES">Avançado ou Referência (podem ensinar)</option>
                <option value="EXPECTATIVA">Na expectativa (Aplicado ou acima)</option>
                <option value="ED">Em Desenvolvimento (precisam desenvolver)</option>
              </select>
            </Rotulado>
            <Rotulado rotulo="Empregado">
              <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pelo nome" style={campo} />
            </Rotulado>
          </div>
          {consulta.isFetching && <span style={{ fontSize: 14, color: C.secundario }}>Atualizando…</span>}
        </section>

        {pessoaAberta && (
          <section style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: "clamp(16px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 18 }}>{pessoaAberta.nome}</div>
                <div style={{ fontSize: 13, color: C.secundario }}>
                  {nomeArea(pessoaAberta.unidade)}
                  {pessoaAberta.lider ? " · líder" : ""}
                </div>
              </div>
              <Botao onClick={() => setAberto(null)}>Fechar</Botao>
            </div>
            <Detalhe l={pessoaAberta} colunas={r.colunas} ad={r.ad} />
          </section>
        )}

        <section style={{ background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 20, padding: "clamp(16px, 3vw, 24px)", display: "flex", flexDirection: "column", gap: 16 }}>
          {modo === "INICIO" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0" }}>
              <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 18 }}>Por onde começar</div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 15, color: C.corpo, lineHeight: 1.7 }}>
                <li>
                  <strong>Quem sabe um eixo?</strong> Escolha o tipo de eixo e depois o eixo. Aparece a lista de pessoas em cada conceito.
                </li>
                <li>
                  <strong>Como está uma equipe?</strong> Escolha a área. Aparece a matriz só daquela área, com os eixos do tipo escolhido.
                </li>
                <li>
                  <strong>Uma pessoa?</strong> Busque pelo nome e clique nele para ver o detalhe.
                </li>
              </ol>
            </div>
          )}

          {modo === "EIXO" && (
            <>
              <div>
                <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 18 }}>{eixoValido}</div>
                <div style={{ fontSize: 14, color: C.secundario }}>
                  {comEixo.length} {comEixo.length === 1 ? "pessoa avaliada" : "pessoas avaliadas"} neste {nomeTipo}
                  {area ? ` em ${nomeArea(area)}` : ""}. Conceito na medição atual. Clique no nome para ver o detalhe.
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(240px, 100%), 1fr))", gap: 12 }}>
                {porConceito.map(({ c, l }) => (
                  <div key={c} style={{ border: `1px solid ${C.borda}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ background: COR_CONCEITO[c], color: corTexto(c), padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
                      <span>{ROTULO_CONCEITO[c]}</span>
                      <span>{l.length}</span>
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
                      {l.length ? l.map((p: any) => <div key={p.id}>{botaoNome(p, true)}</div>) : <span style={{ fontSize: 13, color: C.secundario, padding: 6 }}>Ninguém</span>}
                    </div>
                  </div>
                ))}
                {aguardando.length > 0 && (
                  <div style={{ border: `1px dashed ${C.borda}`, borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ background: C.cinzaClaro, padding: "10px 14px", display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
                      <span>Aguardando a medição atual</span>
                      <span>{aguardando.length}</span>
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2, maxHeight: 320, overflowY: "auto" }}>
                      {aguardando.map((p: any) => (
                        <div key={p.id}>{botaoNome(p, true)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {modo === "GRADE" && (
            <>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 18 }}>{area ? nomeArea(area) : "Resultado da busca"}</div>
                <span style={{ fontSize: 14, color: C.secundario }}>
                  {linhasGrade.length} {linhasGrade.length === 1 ? "empregado" : "empregados"}
                </span>
              </div>
              <LegendaMatriz empregado />
              {linhasGrade.length && colunas.length ? (
                <Moldura rotulo="Matriz de conhecimento por empregado">
                  <table style={estiloTabela}>
                    <Cabecalho
                      colunas={colunas}
                      rotulos={(tipo === "COMP" ? ROTULO_GRUPO_COMP : { T: "Transversais · todo o Sebrae", L: "Liderança · líderes", E: "Essenciais e demais eixos" }) as Record<Grupo, string>}
                      primeira="Empregado"
                    />
                    <tbody>
                      {linhasGrade.map((l: any) => (
                        <tr key={l.id}>
                          <th scope="row" style={{ position: "sticky", left: 0, zIndex: 1, background: C.cartao, textAlign: "left", padding: "2px 12px 2px 0", minWidth: 220 }}>
                            {botaoNome(l)}
                          </th>
                          {colunas.map((c) => {
                            const cel = l[chave][c.nome];
                            return conceito === "TODOS" || (cel && passaConceito(conceito, cel.depois)) ? (
                              <CelulaPessoa key={c.nome} c={cel} eixo={c.nome} />
                            ) : (
                              <td key={c.nome} style={{ textAlign: "center", color: C.neutro }}>
                                ·
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Moldura>
              ) : (
                <div style={{ fontSize: 15, color: C.secundario }}>Ninguém com esses filtros.</div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
