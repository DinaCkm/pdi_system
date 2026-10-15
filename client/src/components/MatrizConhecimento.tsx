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

function LegendaConceitosSimples() {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", fontSize: 13, color: C.secundario }}>
      {CONCEITOS.map((c) => (
        <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: COR_CONCEITO[c] }} />
          {ROTULO_CONCEITO[c]}
        </span>
      ))}
    </div>
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
            Competências · AD {ad.anoBase ? `${ad.anoBase}/${ad.anoBase + 1}` : "[a carregar]"} → {ad.anoAtual ? `${ad.anoAtual}/${ad.anoAtual + 1}` : "[a carregar]"}
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

// ---------- Matriz Unidade × Eixo (aba só administradores) ----------
// Célula = conceito que pelo menos metade da unidade alcançou no eixo (quem tem o eixo como
// Essencial ou Transversal) + quantos evoluíram de conceito (nunca "desceu": só evoluiu ou não houve evolução). Clique abre as pessoas.

const ROTULO_CURTO: Record<Conceito, string> = {
  EM_DESENVOLVIMENTO: "Em Desenv.",
  APLICADO: "Aplicado",
  CONSOLIDADO: "Consolidado",
  AVANCADO: "Avançado",
  REFERENCIA: "Referência",
};

const conceitoDaMetade = (l: Conceito[]): Conceito | null => {
  if (!l.length) return null;
  const o = [...l].sort((a, b) => CONCEITOS.indexOf(a) - CONCEITOS.indexOf(b));
  return o[Math.floor((o.length - 1) / 2)];
};
const nivel = (c: Conceito) => CONCEITOS.indexOf(c);

type Situacao = "SEM_PLANO" | "ACAO_SEM_EFEITO" | "EM_ANDAMENTO" | "AGUARDANDO" | "NA_EXPECTATIVA" | "DESENVOLVIDO" | "DOMINIO" | "POTENCIAL" | "NENHUMA";
const SITUACAO: Record<Situacao, { rotulo: string; fundo: string; texto: string; ordem: number }> = {
  SEM_PLANO: { rotulo: "Sem plano", fundo: "#FBF1E2", texto: "#6B430C", ordem: 0 },
  ACAO_SEM_EFEITO: { rotulo: "Ação sem efeito", fundo: "#FBE4DC", texto: "#8A2E12", ordem: 1 },
  EM_ANDAMENTO: { rotulo: "Ação não realizada", fundo: "#FBF1E2", texto: "#6B430C", ordem: 2 },
  AGUARDANDO: { rotulo: "Aguardando medição", fundo: "#EEF1F4", texto: "#46505E", ordem: 3 },
  NA_EXPECTATIVA: { rotulo: "Na expectativa", fundo: "#E3F2F1", texto: "#0B3B3B", ordem: 4 },
  DESENVOLVIDO: { rotulo: "Desenvolvido", fundo: "#DFF1E4", texto: "#1E5B2E", ordem: 5 },
  DOMINIO: { rotulo: "Domínio", fundo: "#CDE8E5", texto: "#0B3B3B", ordem: 6 },
  POTENCIAL: { rotulo: "Potencialidade", fundo: "#ECE6F6", texto: "#4B2E83", ordem: 7 },
  NENHUMA: { rotulo: "", fundo: "transparent", texto: C.secundario, ordem: 8 },
};

function situacaoDe(c: any): Situacao {
  if (c.relacao === "NAO_ESSENCIAL") return c.depois && c.depois !== "EM_DESENVOLVIMENTO" ? "POTENCIAL" : "NENHUMA";
  if (!c.depois) return "AGUARDANDO";
  if (c.depois === "AVANCADO" || c.depois === "REFERENCIA") return "DOMINIO";
  if (c.depois !== "EM_DESENVOLVIMENTO") return c.antes === "EM_DESENVOLVIMENTO" ? "DESENVOLVIDO" : "NA_EXPECTATIVA";
  if (c.concluidasAntesNm > 0) return "ACAO_SEM_EFEITO";
  if (c.acoesAtivas > 0) return "EM_ANDAMENTO";
  return "SEM_PLANO";
}

// O que cada situação quer dizer, em uma linha (aparece no painel da célula).
const EXPLICA_SITUACAO: Record<Situacao, string> = {
  SEM_PLANO: "Está no conceito Em Desenvolvimento e não tem ação no PDI neste eixo.",
  ACAO_SEM_EFEITO: "Concluiu ação no PDI e continua no conceito Em Desenvolvimento.",
  EM_ANDAMENTO: "Tinha ação no PDI neste eixo e não concluiu.",
  AGUARDANDO: "Ainda não fez a nova medição.",
  NA_EXPECTATIVA: "Está na expectativa de desenvolvimento (Conhecimento Aplicado ou acima).",
  DESENVOLVIDO: "Saiu do conceito Em Desenvolvimento e chegou à expectativa.",
  DOMINIO: "Está em Conhecimento Avançado ou Referência: pode ensinar.",
  POTENCIAL: "Eixo não exigido na função, já na expectativa: pode ensinar.",
  NENHUMA: "",
};

const ROTULO_REL: Record<string, string> = { TRANSVERSAL: "Transversal", ESSENCIAL: "Essencial", NAO_ESSENCIAL: "Não essencial" };
const sigla = (u: string) => nomeArea(u).split(" · ")[0];

type Celula =
  | { aplica: false; potencial: number }
  | { aplica: true; n: number; medidas: number; conceito: Conceito | null; conceitoAntes: Conceito | null; subiram: number; desceram: number; semEvolucao: number; naExpectativa: number; semPlano: number; potencial: number };

export function MatrizEmpregados() {
  const [publico, setPublico] = useState<Publico>("TODOS");
  const [tipo, setTipo] = useState<TipoFiltro>("T");
  const [sel, setSel] = useState<{ unidade: string; eixo: string } | null>(null);

  const consulta = api.matrizEmpregados.useQuery(publico !== "TODOS" ? { publico } : undefined, { refetchOnWindowFocus: false, keepPreviousData: true });
  const r: any = consulta.data;
  const chave = tipo === "COMP" ? "comportamental" : "tecnico";

  const dados = useMemo(() => {
    if (!r) return null;
    const linhas: any[] = r.linhas.filter((l: any) => publico === "TODOS" || (publico === "LIDERES" ? l.lider : !l.lider));
    const todas: Coluna[] = r.colunas[tipo === "COMP" ? "COMPORTAMENTAL" : "TECNICO"];
    const candidatas = tipo === "COMP" ? todas : todas.filter((c) => c.grupo === tipo);
    const unidades = Array.from(new Set(linhas.map((l) => l.unidade as string))).sort((a, b) => sigla(a).localeCompare(sigla(b), "pt-BR"));
    const celula = (unidade: string, eixo: string): Celula => {
      const com = linhas.filter((l) => l.unidade === unidade && l[chave][eixo]);
      const et = com.filter((l) => l[chave][eixo].relacao !== "NAO_ESSENCIAL");
      const potencial = com.length - et.length;
      if (!et.length) return { aplica: false, potencial };
      const cs = et.map((l) => l[chave][eixo]);
      const med = cs.filter((c) => c.depois);
      const ambos = cs.filter((c) => c.depois && c.antes);
      return {
        aplica: true,
        n: et.length,
        medidas: med.length,
        conceito: conceitoDaMetade(med.map((c) => c.depois)),
        conceitoAntes: conceitoDaMetade(cs.filter((c) => c.antes).map((c) => c.antes)),
        subiram: ambos.filter((c) => nivel(c.depois) > nivel(c.antes)).length,
        desceram: ambos.filter((c) => nivel(c.depois) < nivel(c.antes)).length,
        semEvolucao: ambos.filter((c) => nivel(c.depois) <= nivel(c.antes)).length,
        naExpectativa: med.filter((c) => c.depois !== "EM_DESENVOLVIMENTO").length,
        semPlano: cs.filter((c) => situacaoDe(c) === "SEM_PLANO").length,
        potencial,
      };
    };
    const grade = new Map<string, Celula>();
    for (const u of unidades) for (const c of candidatas) grade.set(`${u}|${c.nome}`, celula(u, c.nome));
    const colunas = candidatas.filter((c) => unidades.some((u) => (grade.get(`${u}|${c.nome}`) as any).aplica));

    // Riscos de conhecimento (regras simples, só células com 3 pessoas medidas ou mais).
    const validas = Array.from(grade.entries())
      .map(([k, c]) => ({ unidade: k.split("|")[0], eixo: k.slice(k.indexOf("|") + 1), c }))
      .filter((x): x is { unidade: string; eixo: string; c: Extract<Celula, { aplica: true }> } => x.c.aplica && x.c.medidas >= 3);
    const riscos: Array<{ titulo: string; texto: string; tipo: "alerta" | "multiplicador"; alvo?: { unidade: string; eixo: string } }> = [];
    const menor = [...validas].sort((a, b) => a.c.naExpectativa / a.c.medidas - b.c.naExpectativa / b.c.medidas || b.c.n - a.c.n)[0];
    if (menor && menor.c.naExpectativa < menor.c.medidas) {
      riscos.push({
        titulo: `${menor.eixo} · ${sigla(menor.unidade)}`,
        texto: `Só ${menor.c.naExpectativa} de ${menor.c.medidas} na expectativa de desenvolvimento${menor.c.semPlano ? `; ${menor.c.semPlano} sem plano` : ""}.`,
        tipo: "alerta",
        alvo: { unidade: menor.unidade, eixo: menor.eixo },
      });
    }
    const queda = [...validas]
      .filter((x) => !(menor && x.unidade === menor.unidade && x.eixo === menor.eixo))
      .sort((a, b) => b.c.desceram + b.c.semPlano - (a.c.desceram + a.c.semPlano))[0];
    if (queda && queda.c.desceram + queda.c.semPlano > 0) {
      riscos.push({
        titulo: `${queda.eixo} · ${sigla(queda.unidade)}`,
        texto: [queda.c.desceram ? `${queda.c.semEvolucao} sem evolução de conceito` : "", queda.c.semPlano ? `${queda.c.semPlano} sem plano` : ""].filter(Boolean).join(" e ") + ".",
        tipo: "alerta",
        alvo: { unidade: queda.unidade, eixo: queda.eixo },
      });
    }
    if (menor) {
      const fortes = linhas.filter((l) => l.unidade !== menor.unidade && l[chave][menor.eixo] && (l[chave][menor.eixo].depois === "AVANCADO" || l[chave][menor.eixo].depois === "REFERENCIA")).length;
      if (fortes) riscos.push({ titulo: "Multiplicadores disponíveis", texto: `${fortes} ${fortes === 1 ? "pessoa" : "pessoas"} de outras unidades em Avançado ou Referência em ${menor.eixo} podem apoiar a ${sigla(menor.unidade)}.`, tipo: "multiplicador", alvo: { unidade: menor.unidade, eixo: menor.eixo } });
    }
    return { linhas, unidades, colunas, grade, riscos };
  }, [r, tipo, publico, chave]);

  if (consulta.isLoading && !r) return <div style={{ padding: 32, fontFamily: FONTE_TEXTO, color: C.secundario }}>Carregando a matriz de conhecimento…</div>;
  if (consulta.isError || !r || !dados) {
    return (
      <div style={{ padding: 24, borderRadius: 16, background: C.focoFundo, color: C.focoTexto, fontFamily: FONTE_TEXTO }}>
        Não foi possível carregar a matriz. {consulta.error?.message ?? ""}
      </div>
    );
  }

  const { unidades, colunas, grade, riscos, linhas } = dados;
  const anoBase = tipo === "COMP" ? (r.ad.anoBase ? `${r.ad.anoBase}/${r.ad.anoBase + 1}` : "anterior") : "2025";
  const anoAtual = tipo === "COMP" ? (r.ad.anoAtual ? `${r.ad.anoAtual}/${r.ad.anoAtual + 1}` : "atual") : "2026";
  const selValida = sel && grade.has(`${sel.unidade}|${sel.eixo}`) && colunas.some((c) => c.nome === sel.eixo) ? sel : null;
  const celSel = selValida ? (grade.get(`${selValida.unidade}|${selValida.eixo}`) as Celula) : null;
  const pessoasSel = selValida
    ? linhas
        .filter((l) => l.unidade === selValida.unidade && l[chave][selValida.eixo])
        .map((l) => ({ l, c: l[chave][selValida.eixo], s: situacaoDe(l[chave][selValida.eixo]) }))
        .sort((a, b) => SITUACAO[a.s].ordem - SITUACAO[b.s].ordem || a.l.nome.localeCompare(b.l.nome, "pt-BR"))
    : [];
  const conta = (rel: string) => pessoasSel.filter((p) => (p.c.relacao ?? "ESSENCIAL") === rel).length;
  const cartao: React.CSSProperties = { background: C.cartao, border: `1px solid ${C.borda}`, borderRadius: 16, padding: "clamp(16px, 3vw, 24px)" };
  const nomeTipo = { T: "Transversais", L: "Liderança", E: "Essenciais", COMP: "Competências" }[tipo];

  return (
    <div style={{ fontFamily: FONTE_TEXTO, color: C.texto, background: C.fundo, borderRadius: 20 }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "clamp(16px, 3vw, 32px) clamp(12px, 3vw, 24px) 48px", display: "flex", flexDirection: "column", gap: 20 }}>
        <header style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secundario }}>Sebrae/TO · ciclo 2025/26 · só administradores</div>
          <h1 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: "clamp(24px, 4vw, 30px)", fontWeight: 700 }}>Matriz de conhecimento</h1>
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
          <Abas
            rotulo="Tipo de eixo"
            valor={tipo}
            onChange={(v) => {
              setTipo(v);
              setSel(null);
            }}
            opcoes={[
              ["T", "Transversais"],
              ["L", "Liderança"],
              ["E", "Essenciais"],
              ["COMP", "Competências"],
            ]}
          />
          <Rotulado rotulo="Público">
            <select value={publico} onChange={(e) => setPublico(e.target.value as Publico)} style={campo}>
              <option value="TODOS">Todos</option>
              <option value="LIDERES">Líderes</option>
              <option value="DEMAIS">Demais empregados</option>
            </select>
          </Rotulado>
          {consulta.isFetching && <span style={{ fontSize: 14, color: C.secundario, paddingBottom: 12 }}>Atualizando…</span>}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-start" }}>
          <section style={{ ...cartao, flex: "999 1 620px", minWidth: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 19, fontWeight: 600 }}>
                Unidade × {tipo === "COMP" ? "Competência" : "Eixo"} — conceito em {anoAtual}
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 13, color: C.secundario }}>
                {CONCEITOS.map((c) => (
                  <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: COR_CONCEITO[c] }} />
                    {ROTULO_CONCEITO[c]}
                  </span>
                ))}
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 3, border: `1px dashed ${C.neutro}`, background: C.cinzaClaro }} />
                  Não se aplica
                </span>
              </div>
            </div>
            {colunas.length && unidades.length ? (
              <div role="region" aria-label={`Matriz unidade por ${nomeTipo}`} tabIndex={0} style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "separate", borderSpacing: 4, fontVariantNumeric: "tabular-nums" }}>
                  <thead>
                    <tr>
                      <th style={{ position: "sticky", left: 0, background: C.cartao, zIndex: 2 }} />
                      {colunas.map((c) => (
                        <th key={c.nome} scope="col" style={{ width: 104, minWidth: 104, fontSize: 12, fontWeight: 600, color: C.corpo, textAlign: "left", verticalAlign: "bottom", padding: "0 2px 4px", lineHeight: 1.25 }}>
                          {c.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unidades.map((u) => (
                      <tr key={u}>
                        <th scope="row" title={nomeArea(u)} style={{ position: "sticky", left: 0, background: C.cartao, zIndex: 1, textAlign: "left", fontSize: 14, fontWeight: 700, padding: "0 12px 0 0", whiteSpace: "nowrap" }}>
                          {sigla(u)}
                        </th>
                        {colunas.map((c) => {
                          const cel = grade.get(`${u}|${c.nome}`)!;
                          const ativo = selValida?.unidade === u && selValida?.eixo === c.nome;
                          if (!cel.aplica) {
                            return (
                              <td key={c.nome}>
                                <div style={{ height: 54, borderRadius: 8, border: `1px dashed ${C.neutro}`, background: C.cinzaClaro, color: C.secundario, fontSize: 11, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                  <span>—</span>
                                  <span>não se aplica</span>
                                </div>
                              </td>
                            );
                          }
                          const cor = cel.conceito ? COR_CONCEITO[cel.conceito] : C.linhaSuave;
                          const txt = cel.conceito ? corTexto(cel.conceito) : C.secundario;
                          return (
                            <td key={c.nome}>
                              <button
                                type="button"
                                aria-pressed={ativo}
                                onClick={() => setSel(ativo ? null : { unidade: u, eixo: c.nome })}
                                title={`${sigla(u)} · ${c.nome}: ${cel.n} ${cel.n === 1 ? "pessoa" : "pessoas"}`}
                                style={{
                                  width: "100%",
                                  height: 54,
                                  borderRadius: 8,
                                  border: ativo ? `3px solid ${C.texto}` : "3px solid transparent",
                                  background: cor,
                                  color: txt,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: 2,
                                  padding: 0,
                                }}
                              >
                                <span style={{ fontSize: 13, fontWeight: 700 }}>{cel.conceito ? ROTULO_CURTO[cel.conceito] : "aguardando"}</span>
                                <span style={{ fontSize: 11, fontWeight: 600 }}>
                                  {cel.subiram ? (
                                    `▲ ${cel.subiram} ${cel.subiram === 1 ? "evoluiu" : "evoluíram"}`
                                  ) : (
                                    `${cel.n} ${cel.n === 1 ? "pessoa" : "pessoas"}`
                                  )}
                                </span>
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 15, color: C.secundario }}>Nenhum eixo deste tipo com esses filtros.</div>
            )}
            <p style={{ margin: 0, fontSize: 13, color: C.secundario }}>
              Cada célula: conceito que pelo menos metade das pessoas da unidade com o {tipo === "COMP" ? "competência" : "eixo Essencial ou Transversal"} alcançou em {anoAtual}; ▲ quantas evoluíram de conceito desde {anoBase}. Clique para ver as pessoas.
            </p>
          </section>

          <aside style={{ ...cartao, flex: "1 1 320px", position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: C.secundario }}>Célula selecionada</div>
            {selValida && celSel && celSel.aplica ? (
              <>
                <div>
                  <div style={{ fontFamily: FONTE_TITULO, fontWeight: 600, fontSize: 18 }}>{selValida.eixo}</div>
                  <div style={{ fontSize: 14, color: C.secundario }}>{nomeArea(selValida.unidade)}</div>
                </div>
                {(() => {
                  const ess = conta("ESSENCIAL");
                  const tr = conta("TRANSVERSAL");
                  const pot = conta("NAO_ESSENCIAL");
                  const total = pessoasSel.length;
                  const emp = (n: number) => `${n} ${n === 1 ? "empregado" : "empregados"}`;
                  const partes =
                    tipo === "COMP"
                      ? []
                      : [
                          ess ? `${emp(ess)} com o eixo essencial na função` : "",
                          tr ? `${emp(tr)} com o eixo ${tipo === "L" ? "transversal de liderança" : "transversal (comum a todo o Sebrae)"}` : "",
                          pot ? `${emp(pot)} com o eixo não essencial (potencialidade)` : "",
                        ].filter(Boolean);
                  return (
                    <p style={{ margin: 0, fontSize: 14, color: C.corpo, lineHeight: 1.5 }}>
                      {emp(total)} avaliados {tipo === "COMP" ? "nesta competência" : "neste eixo"}
                      {partes.length ? `: ${partes.join("; ")}` : ""}.
                    </p>
                  );
                })()}
                <div style={{ borderRadius: 10, background: C.cinzaClaro, padding: "10px 12px", fontSize: 14, color: C.corpo, lineHeight: 1.5 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.secundario }}>CONCEITO DA UNIDADE (alcançado por pelo menos metade)</div>
                  <div>
                    {anoBase}: <strong>{celSel.conceitoAntes ? ROTULO_CONCEITO[celSel.conceitoAntes] : "sem medição"}</strong>
                  </div>
                  <div>
                    {anoAtual}: <strong>{celSel.conceito ? ROTULO_CONCEITO[celSel.conceito] : "aguardando a nova medição"}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
                  {pessoasSel.map(({ l, c, s }) => {
                    const sit = SITUACAO[s as Situacao];
                    const rel = tipo === "COMP" ? "Competência" : c.relacao === "TRANSVERSAL" && tipo === "L" ? "Transversal de liderança" : ROTULO_REL[c.relacao ?? "ESSENCIAL"];
                    return (
                      <div key={l.id} style={{ border: `1px solid ${C.borda}`, borderRadius: 10, padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>
                            {l.nome}
                            <span style={{ fontWeight: 400, color: C.secundario, fontSize: 12 }}>
                              {" "}
                              · {rel}
                              {l.lider ? " · líder" : ""}
                            </span>
                          </div>
                          {sit.rotulo && (
                            <span style={{ flex: "none", padding: "3px 10px", borderRadius: 999, background: sit.fundo, color: sit.texto, fontSize: 12, fontWeight: 700 }}>{sit.rotulo}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: C.corpo }}>
                          {anoBase}: <strong>{c.antes ? ROTULO_CONCEITO[c.antes as Conceito] : "sem medição"}</strong> → {anoAtual}:{" "}
                          <strong>{c.depois ? ROTULO_CONCEITO[c.depois as Conceito] : "aguardando"}</strong>
                        </div>
                        {EXPLICA_SITUACAO[s as Situacao] && <div style={{ fontSize: 12, color: C.secundario }}>{EXPLICA_SITUACAO[s as Situacao]}</div>}
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 15, color: C.secundario }}>Clique numa célula da matriz para ver as pessoas da unidade naquele {tipo === "COMP" ? "competência" : "eixo"}.</div>
            )}
          </aside>
        </div>

        <section style={{ ...cartao, display: "flex", flexDirection: "column", gap: 14 }}>
          <h2 style={{ margin: 0, fontFamily: FONTE_TITULO, fontSize: 19, fontWeight: 600 }}>Riscos de conhecimento</h2>
          {riscos.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))", gap: 12 }}>
              {riscos.map((x) => (
                <button
                  key={x.titulo + x.texto}
                  type="button"
                  onClick={() => x.alvo && setSel(x.alvo)}
                  style={{
                    textAlign: "left",
                    fontFamily: "inherit",
                    cursor: x.alvo ? "pointer" : "default",
                    borderRadius: 12,
                    padding: "14px 16px",
                    border: `1px solid ${x.tipo === "multiplicador" ? "#D8CCEF" : "#F1DFA6"}`,
                    background: x.tipo === "multiplicador" ? "#F6F2FC" : "#FFF9E8",
                    color: C.texto,
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{x.titulo}</div>
                  <div style={{ fontSize: 14, color: C.corpo }}>{x.texto}</div>
                </button>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 15, color: C.secundario }}>Nenhum risco com 3 ou mais pessoas medidas neste filtro.</div>
          )}
        </section>
      </div>
    </div>
  );
}
