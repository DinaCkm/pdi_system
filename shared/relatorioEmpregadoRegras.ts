// Relatório gerencial do empregado no PDI — regras puras de montagem.
// Modelo aprovado pela Dina em 15/10/2026 (caso Carlucia/RPJ): a história da pessoa em linha do
// tempo — o que foi levantado, o que foi trabalhado e como foi trabalhado.
// Regras fixas:
//   - só conceitos, nunca notas ou percentuais;
//   - evolução só como "evoluiu" ou "não houve evolução" (nunca caiu/desceu/queda/redução);
//   - a primeira Avaliação de Desempenho do sistema é a AD 2025 e a segunda, a AD 2026
//     (no banco elas têm o ano de referência: 2024 e 2025);
//   - pontos de melhoria vêm de duas fontes: AD (comportamental) e Certificação Técnica (técnico);
//   - a validação do líder registrada em 2026 é do PDI técnico (criado depois da Avaliação de Proficiência).

export type Conceito = "EM_DESENVOLVIMENTO" | "APLICADO" | "CONSOLIDADO" | "AVANCADO" | "REFERENCIA";
export type TipoCompetencia = "COMPORTAMENTAL" | "TECNICA";

export const ROTULO_CONCEITO: Record<Conceito, string> = {
  EM_DESENVOLVIMENTO: "Em Desenvolvimento",
  APLICADO: "Conhecimento Aplicado",
  CONSOLIDADO: "Conhecimento Consolidado",
  AVANCADO: "Conhecimento Avançado",
  REFERENCIA: "Referência",
};
const NIVEL: Record<Conceito, number> = { EM_DESENVOLVIMENTO: 1, APLICADO: 2, CONSOLIDADO: 3, AVANCADO: 4, REFERENCIA: 5 };
export const naExpectativa = (c: Conceito | null | undefined) => !!c && NIVEL[c] >= NIVEL.APLICADO;

// Normaliza os nomes de conceito usados no sistema (técnico e comportamental) para a régua única.
export function conceitoDe(v: unknown): Conceito | null {
  const t = String(v ?? "").toUpperCase();
  if (!t) return null;
  if (t === "EM_DESENVOLVIMENTO") return "EM_DESENVOLVIMENTO";
  if (t === "CONHECIMENTO_APLICADO" || t === "EM_APLICACAO" || t === "APLICADO") return "APLICADO";
  if (t === "CONHECIMENTO_CONSOLIDADO" || t === "CONSOLIDADO") return "CONSOLIDADO";
  if (t === "CONHECIMENTO_AVANCADO" || t === "AVANCADO") return "AVANCADO";
  if (t === "REFERENCIA") return "REFERENCIA";
  return null;
}

// A AD é registrada pelo ano de referência; o nome usado na empresa é o ano seguinte.
export const rotuloAD = (anoReferencia: number) => `AD ${anoReferencia + 1}`;

export type BaseRelatorio = {
  hoje: string; // aaaa-mm-dd
  empregado: { nome: string; funcao: string | null; cargo: string | null; unidade: string | null };
  lider: { nome: string; cargo: string | null } | null;
  ad: Array<{
    competencia: string;
    transversal: boolean;
    anterior: { anoReferencia: number; conceito: Conceito } | null;
    atual: { anoReferencia: number; conceito: Conceito } | null;
  }>;
  tecnico: {
    eixos: Array<{ nome: string; classificacao: string | null; anterior: Conceito | null; atual: Conceito | null }>;
    aguardandoProva: boolean;
    analise: { mes: string | null; classificacao: string | null; consolidados: string[]; evolucao: string[] } | null;
  };
  pdi2025: {
    aprovadoLider: boolean | null;
    areas: Array<{ area: string; tipo: TipoCompetencia | null; competencia: string | null; criadoEm: string | null }>;
    acoes: Array<{ acao: string; area: string | null; tipo: TipoCompetencia | null; competencia: string | null; tipoAcao: string | null; prazo: string | null; concluidoEm: string | null; finalizada: boolean }>;
  } | null;
  pdi2026: {
    pdis: Array<{ titulo: string; criadoEm: string; status: string }>;
    acoes: Array<{
      titulo: string;
      macro: string | null;
      competencia: string | null;
      prazo: string | null;
      status: string;
      pdiTitulo: string;
      evidencia: { entregueEm: string; status: string; horas: number | null; oQue: string | null; resultado: string | null } | null;
    }>;
    ajustes: Array<{ acao: string; criadoEm: string; status: string; campos: string | null }>;
    solicitacoes: Array<{ titulo: string; criadoEm: string; status: string }>;
    validacoes: Array<{ em: string; liderNome: string | null; pdiTitulo: string }>;
  };
};

export type Bloco =
  | { tipo: "paragrafo"; destaque?: string; texto: string }
  | { tipo: "lista"; titulo?: string; itens: Array<{ destaque?: string; texto: string }> };
export type Capitulo = { titulo: string; blocos: Bloco[] };
export type Evento = { chave: string; rotulo: string; inicio: string; fim: string; tipo: "AVALIACAO" | "PDI" | "MARCO" | "HOJE"; detalhe: string };
export type Tabela = { titulo: string; descricao?: string; colunas: string[]; linhas: string[][] };
export type Relatorio = {
  titulo: string;
  posicaoEm: string;
  identificacao: Array<[string, string]>;
  resumo: string[];
  linhaDoTempo: Evento[];
  capitulos: Capitulo[];
  anexo: Tabela[];
};

// ---------- texto ----------

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
export const mesExtenso = (d: string) => `${MESES[Number(d.slice(5, 7)) - 1]} de ${d.slice(0, 4)}`;
export const mesCurto = (d: string) => `${MESES_CURTOS[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}`;
export const diaMes = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export const dataBr = (d: string | null) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—");

export function lista(itens: string[]): string {
  const l = itens.filter(Boolean);
  if (l.length <= 1) return l[0] ?? "";
  return `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}
const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);
const contagem = (n: number, um: string, varios: string) => `${n} ${plural(n, um, varios)}`;

export function resumir(texto: string | null | undefined, max = 240): string {
  const t = String(texto ?? "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max);
  const fim = Math.max(corte.lastIndexOf(". "), corte.lastIndexOf("; "));
  if (fim > max * 0.5) return corte.slice(0, fim + 1);
  return `${corte.slice(0, corte.lastIndexOf(" "))}…`;
}

// Títulos de ação do PDI 2025 trazem o horizonte ("- MÉDIO PRAZO"); a história não precisa dele.
export function limparTitulo(t: string): string {
  return t
    .replace(/[~]+/g, "")
    .replace(/\s*-?\s*(curto|m[ée]dio|longo)\s+prazo\s*$/i, "")
    .replace(/\s*-\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const semPrefixo = (macro: string | null) => (macro ? macro.replace(/^(COMPORTAMENTAL|T[ÉE]CNICA)\s*-\s*/i, "").trim() : "");
export function tipoDaMacro(macro: string | null): TipoCompetencia | null {
  if (!macro) return null;
  if (/^COMPORTAMENTAL/i.test(macro)) return "COMPORTAMENTAL";
  if (/^T[ÉE]CNICA/i.test(macro)) return "TECNICA";
  return null;
}

// ---------- relação por tema entre ações e competências da AD ----------
// Liga, por palavras do tema, as ações dos PDIs às competências da Avaliação de Desempenho.
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const TEMAS: Array<[RegExp, RegExp]> = [
  [/comunicacao/, /comunica|oratori|escuta|apresenta/],
  [/relacionamento interpessoal/, /interpessoal|relacional|relacionamento com (a )?equipe|reunio|reuniao/],
  [/foco no cliente/, /cliente|atendimento/],
  [/tomada de decisao/, /decis/],
  [/inovacao/, /inova|criativ/],
  [/protagonismo/, /protagonismo|autogest/],
  [/atuacao colaborativa/, /colabora|trabalho em equipe/],
  [/resultados/, /resultado|indicador|planejamento|meta/],
  [/empreendedor/, /empreend|negocia|vendas/],
];
export function temaDaCompetencia(competencia: string): RegExp | null {
  const c = sem(competencia);
  for (const [comp, tema] of TEMAS) if (comp.test(c)) return tema;
  return null;
}
const trabalhouTema = (tema: RegExp | null, textos: string[]) => !!tema && textos.some((t) => tema.test(sem(t)));

// ---------- montagem ----------

export function montarRelatorioEmpregado(b: BaseRelatorio): Relatorio {
  const primeiroNome = b.empregado.nome.split(" ")[0];

  // Avaliação de Desempenho
  const anosAD = b.ad.flatMap((c) => [c.anterior?.anoReferencia, c.atual?.anoReferencia]).filter((x): x is number => !!x);
  const anoAD1 = anosAD.length ? Math.min(...anosAD) : null;
  const anoAD2 = anosAD.length ? Math.max(...anosAD) : null;
  const temDuasAD = anoAD1 !== null && anoAD2 !== null && anoAD1 !== anoAD2;
  const AD1 = anoAD1 !== null ? rotuloAD(anoAD1) : null;
  const AD2 = temDuasAD ? rotuloAD(anoAD2!) : null;
  const adNa = (ano: number | null) =>
    b.ad
      .map((c) => ({ nome: c.competencia, transversal: c.transversal, conceito: c.anterior?.anoReferencia === ano ? c.anterior.conceito : c.atual?.anoReferencia === ano ? c.atual.conceito : null }))
      .filter((c): c is { nome: string; transversal: boolean; conceito: Conceito } => !!c.conceito);
  const ad1 = adNa(anoAD1);
  const ad2 = temDuasAD ? adNa(anoAD2) : [];
  const conceitoEm = (lista_: typeof ad1, nome: string) => lista_.find((c) => c.nome === nome)?.conceito ?? null;
  const comparadas = ad2
    .map((c) => ({ nome: c.nome, transversal: c.transversal, antes: conceitoEm(ad1, c.nome), depois: c.conceito }))
    .filter((c): c is { nome: string; transversal: boolean; antes: Conceito; depois: Conceito } => !!c.antes);
  const evoluiu = comparadas.filter((c) => NIVEL[c.depois] > NIVEL[c.antes]);
  const abaixoAD2 = ad2.filter((c) => !naExpectativa(c.conceito));
  const abaixoAD1 = ad1.filter((c) => !naExpectativa(c.conceito));

  // PDI 2025
  const p25 = b.pdi2025;
  const acoes25 = p25?.acoes ?? [];
  const concl25 = acoes25.filter((a) => a.finalizada && a.concluidoEm).sort((x, y) => x.concluidoEm!.localeCompare(y.concluidoEm!));
  const pend25 = acoes25.filter((a) => !a.finalizada);
  const textos25 = [...acoes25.map((a) => `${a.area ?? ""} ${a.competencia ?? ""} ${a.acao}`), ...(p25?.areas ?? []).map((a) => `${a.area} ${a.competencia ?? ""}`)];

  // PDI 2026
  const p26 = b.pdi2026;
  const acoes26 = [...p26.acoes].sort((x, y) => (x.evidencia?.entregueEm ?? x.prazo ?? "9").localeCompare(y.evidencia?.entregueEm ?? y.prazo ?? "9"));
  const textos26 = acoes26.map((a) => `${a.macro ?? ""} ${a.competencia ?? ""} ${a.titulo}`);
  const concl26 = acoes26.filter((a) => a.status === "concluida");
  const evidAprovadas = acoes26.filter((a) => a.evidencia?.status === "aprovada");
  const horas26 = evidAprovadas.reduce((s, a) => s + (a.evidencia?.horas ?? 0), 0);
  const atrasadas26 = acoes26.filter((a) => a.evidencia && a.prazo && a.evidencia.entregueEm > a.prazo);
  const atrasadas25 = concl25.filter((a) => a.prazo && a.concluidoEm! > a.prazo);

  const noPdi = (anos: string[]) => (anos.length > 1 ? `nos PDIs ${lista(anos)}` : `no PDI ${anos[0]}`);
  const anosTrabalhou = (tema: RegExp | null) => [trabalhouTema(tema, textos25) ? "2025" : "", trabalhouTema(tema, textos26) ? "2026" : ""].filter(Boolean);

  // ---------- Identificação ----------
  const pdiAtual = p26.pdis[0] ?? null;
  const identificacao: Array<[string, string]> = [
    ["Empregado(a)", b.empregado.nome],
    ["Função / Cargo", [b.empregado.funcao, b.empregado.cargo].filter(Boolean).join(" / ") || "—"],
    ["Unidade", b.empregado.unidade ?? "—"],
    ["Líder", b.lider ? `${b.lider.nome}${b.lider.cargo ? ` (${b.lider.cargo})` : ""}` : "—"],
    ["PDI atual", pdiAtual ? pdiAtual.titulo : "—"],
  ];

  // ---------- Em resumo ----------
  const totalPlanejadas = acoes25.length + acoes26.length;
  const totalConcluidas = concl25.length + concl26.length;
  const ciclos = [p25 ? "2025" : "", acoes26.length ? "2026" : ""].filter(Boolean);
  const resumo: string[] = [];
  if (totalPlanejadas) {
    const quando = ciclos.length === 2 ? "Em dois ciclos de PDI" : `No PDI ${ciclos[0]}`;
    resumo.push(`${quando}, ${b.empregado.nome} concluiu ${totalConcluidas} de ${totalPlanejadas} ações planejadas${totalConcluidas === totalPlanejadas ? " e nenhuma ficou pendente" : ""}.`);
  }
  if (AD1 && abaixoAD1.length) {
    const nomes = abaixoAD1.map((c) => c.nome);
    const anos = Array.from(new Set(nomes.flatMap((n) => anosTrabalhou(temaDaCompetencia(n)))));
    resumo.push(`Na ${AD1}, o principal ponto a desenvolver era ${lista(nomes)}${anos.length ? `, trabalhado ${noPdi(anos)}` : ""}.`);
  } else if (AD1) {
    resumo.push(`Na ${AD1}, todas as competências comportamentais já estavam na expectativa.`);
  }
  if (AD2) {
    const e = evoluiu.map((c) => c.nome);
    const a = abaixoAD2.map((c) => c.nome);
    resumo.push(
      `Na ${AD2}, ${e.length ? `${lista(e)} ${plural(e.length, "evoluiu", "evoluíram")}` : "não houve evolução de conceito"}; ${a.length ? `${lista(a)} ${plural(a.length, "segue", "seguem")} como o próximo capítulo` : "todas as competências estão na expectativa"}.`,
    );
  }

  // ---------- Capítulo 1 — ponto de partida ----------
  const cap1: Bloco[] = [];
  if (!AD1) {
    cap1.push({ tipo: "paragrafo", texto: "Ainda não há Avaliação de Desempenho registrada na plataforma para este empregado." });
  } else {
    const na = ad1.filter((c) => naExpectativa(c.conceito));
    const max = Math.max(...ad1.map((c) => NIVEL[c.conceito]));
    const fortes = max >= NIVEL.AVANCADO ? ad1.filter((c) => NIVEL[c.conceito] === max) : [];
    cap1.push({
      tipo: "paragrafo",
      texto: `A ${AD1}, primeira Avaliação de Desempenho na plataforma, mostrou ${na.length} de ${ad1.length} competências na expectativa${fortes.length ? `, com ${lista(fortes.map((c) => c.nome))} em ${ROTULO_CONCEITO[fortes[0].conceito]}, ${plural(fortes.length, "sua maior força", "suas maiores forças")}` : ""}.`,
    });
    if (abaixoAD1.length) {
      cap1.push({ tipo: "paragrafo", texto: `${lista(abaixoAD1.map((c) => c.nome))} ${plural(abaixoAD1.length, "ficou", "ficaram")} abaixo da expectativa, no conceito Em Desenvolvimento.` });
    }
    const limite = ad1.filter((c) => c.conceito === "APLICADO");
    if (limite.length) {
      cap1.push({ tipo: "paragrafo", texto: `${lista(limite.map((c) => c.nome))} ${plural(limite.length, "estava", "estavam")} no limite de entrada da expectativa, em Conhecimento Aplicado. Esse retrato orientou o PDI seguinte.` });
    }
  }

  // ---------- Capítulo 2 — PDI 2025 ----------
  const cap2: Bloco[] = [];
  if (!p25) {
    cap2.push({ tipo: "paragrafo", texto: "O PDI 2025 deste empregado não está na base importada do ciclo 2025." });
  } else {
    const criado = p25.areas.map((a) => a.criadoEm).filter((x): x is string => !!x).sort()[0] ?? null;
    const nComp = acoes25.filter((a) => a.tipo === "COMPORTAMENTAL").length;
    const nTec = acoes25.filter((a) => a.tipo === "TECNICA").length;
    const nOutras = acoes25.length - nComp - nTec;
    const tiposAcao = Array.from(new Set(acoes25.map((a) => a.tipoAcao).filter(Boolean)));
    cap2.push({
      tipo: "paragrafo",
      texto:
        `O PDI 2025 ${criado ? `foi montado em ${mesExtenso(criado)}` : "foi conduzido"}${p25.aprovadoLider ? " e aprovado pela liderança" : ""}: ` +
        `${contagem(p25.areas.length, "área de desenvolvimento", "áreas de desenvolvimento")} e ${contagem(acoes25.length, "ação", "ações")} ` +
        `(${[nComp ? contagem(nComp, "comportamental", "comportamentais") : "", nTec ? contagem(nTec, "técnica", "técnicas") : "", nOutras ? `${nOutras} de integração` : ""].filter(Boolean).join(", ")})` +
        `${tiposAcao.length === 1 ? `, todas de ${String(tiposAcao[0]).toLowerCase()}` : ""}.`,
    });
    if (concl25.length) {
      const porMes = new Map<string, string[]>();
      for (const a of concl25) {
        const m = a.concluidoEm!.slice(0, 7);
        porMes.set(m, [...(porMes.get(m) ?? []), limparTitulo(a.acao)]);
      }
      const agrupar = (titulos: string[]) => {
        const cont = new Map<string, number>();
        for (const t of titulos) {
          const k = t.replace(/\s+TEMA\s*:.*$/i, "").replace(/\b\d+\s*[ºª°]\s*/g, "").replace(/\s+/g, " ").trim();
          cont.set(k, (cont.get(k) ?? 0) + 1);
        }
        return Array.from(cont.entries()).map(([k, n]) => (n > 1 ? `${k} (${n} vezes)` : k));
      };
      const capitalizar = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
      cap2.push({
        tipo: "lista",
        titulo: "Como o ciclo andou, mês a mês",
        itens: Array.from(porMes.entries()).map(([m, titulos]) => ({ destaque: capitalizar(mesExtenso(`${m}-01`)), texto: `${lista(agrupar(titulos))}.` })),
      });
      const ultimo = concl25[concl25.length - 1].concluidoEm!;
      const limite30 = new Date(Date.parse(ultimo) - 30 * 864e5).toISOString().slice(0, 10);
      const noFim = concl25.filter((a) => a.concluidoEm! >= limite30).length;
      const frases: string[] = [];
      if (atrasadas25.length) frases.push(`${atrasadas25.length} de ${concl25.length} ações foram concluídas depois do prazo.`);
      else frases.push("Todas as ações foram concluídas no prazo.");
      if (noFim >= 3 && noFim / concl25.length >= 0.3) frases.push(`${noFim} se concentraram nos últimos 30 dias do ciclo.`);
      if (pend25.length) frases.push(`${contagem(pend25.length, "ação ficou pendente e foi transferida", "ações ficaram pendentes e foram transferidas")} para 2026: ${lista(pend25.map((a) => limparTitulo(a.acao)))}.`);
      else frases.push("O ciclo fechou com todas as ações concluídas e nada a transferir para 2026.");
      cap2.push({ tipo: "paragrafo", destaque: "Prazos.", texto: frases.join(" ") });
    }
  }

  // ---------- Capítulo 3 — o que as avaliações mostraram ----------
  const cap3: Bloco[] = [];
  const an = b.tecnico.analise;
  if (an) {
    const titulo = `Certificação Técnica${an.mes ? ` (${mesExtenso(`${an.mes}-01`)})` : ""}.`;
    cap3.push({
      tipo: "paragrafo",
      destaque: titulo,
      texto: `${an.classificacao ? `A análise apontou ${an.classificacao.toLowerCase()}.` : "A análise da certificação descreveu o conhecimento técnico demonstrado."}${an.evolucao.length ? " Pontos de evolução indicados:" : ""}`,
    });
    if (an.evolucao.length) cap3.push({ tipo: "lista", itens: an.evolucao.map((t) => ({ texto: t })) });
  }
  if (AD2) {
    const frases: string[] = [];
    for (const c of evoluiu) frases.push(`${c.nome} evoluiu de ${ROTULO_CONCEITO[c.antes]} para ${ROTULO_CONCEITO[c.depois]}.`);
    const persistentes = comparadas.filter((c) => !naExpectativa(c.antes) && !naExpectativa(c.depois)).map((c) => c.nome);
    const novas = comparadas.filter((c) => naExpectativa(c.antes) && !naExpectativa(c.depois)).map((c) => c.nome);
    if (persistentes.length) frases.push(`Em ${lista(persistentes)} não houve evolução e o conceito segue Em Desenvolvimento.`);
    if (novas.length) frases.push(`Em ${lista(novas)} também não houve evolução e ficou no conceito Em Desenvolvimento.`);
    const restantes = comparadas.filter((c) => !evoluiu.includes(c) && naExpectativa(c.depois)).length;
    if (restantes) frases.push("As demais competências seguem na expectativa.");
    if (!frases.length) frases.push("As competências avaliadas seguem na expectativa.");
    cap3.push({ tipo: "paragrafo", destaque: `Avaliação de Desempenho ${AD2.slice(3)}.`, texto: frases.join(" ") });

    const trabalhadasSemEvolucao = abaixoAD2.map((c) => c.nome).filter((n) => trabalhouTema(temaDaCompetencia(n), textos25));
    const trabalhadasComEvolucao = evoluiu.map((c) => c.nome).filter((n) => trabalhouTema(temaDaCompetencia(n), textos25));
    const leitura: string[] = [];
    if (trabalhadasSemEvolucao.length) leitura.push(`os temas trabalhados no PDI 2025 em ${lista(trabalhadasSemEvolucao)} ainda não aparecem como evolução na avaliação comportamental`);
    if (trabalhadasComEvolucao.length) leitura.push(`${lista(trabalhadasComEvolucao)} ${plural(trabalhadasComEvolucao.length, "evoluiu", "evoluíram")} depois de ${plural(trabalhadasComEvolucao.length, "ser trabalhada", "serem trabalhadas")} no PDI 2025`);
    if (leitura.length) cap3.push({ tipo: "paragrafo", destaque: "Leitura para a liderança:", texto: `${leitura.join("; ")}.` });
  } else if (AD1) {
    cap3.push({ tipo: "paragrafo", texto: "Ainda não há uma segunda Avaliação de Desempenho para comparar com a primeira." });
  }
  if (!cap3.length) cap3.push({ tipo: "paragrafo", texto: "Ainda não há avaliações posteriores ao PDI 2025 registradas para este empregado." });

  // ---------- Capítulo 4 — PDI 2026 ----------
  const cap4: Bloco[] = [];
  if (!acoes26.length) {
    cap4.push({ tipo: "paragrafo", texto: "Não há ações do PDI 2026 registradas para este empregado." });
  } else {
    const nC = acoes26.filter((a) => tipoDaMacro(a.macro) === "COMPORTAMENTAL").length;
    const nT = acoes26.filter((a) => tipoDaMacro(a.macro) === "TECNICA").length;
    const pdisTxt = p26.pdis.map((p) => `${p.titulo} (criado em ${mesExtenso(p.criadoEm)})`);
    cap4.push({
      tipo: "paragrafo",
      texto: `${p26.pdis.length > 1 ? `Em 2026 há ${p26.pdis.length} PDIs: ${lista(pdisTxt)}` : `O ${pdisTxt[0] ?? "PDI 2026"}`} ${p26.pdis.length > 1 ? "somam" : "tem"} ${contagem(acoes26.length, "ação", "ações")}${nC || nT ? `: ${[nC ? contagem(nC, "comportamental", "comportamentais") : "", nT ? contagem(nT, "técnica", "técnicas") : ""].filter(Boolean).join(" e ")}` : ""}.`,
    });
    const marcos: Array<{ data: string; destaque: string; texto: string }> = [];
    for (const a of p26.ajustes) marcos.push({ data: a.criadoEm, destaque: diaMes(a.criadoEm), texto: `Pediu ajuste${a.campos ? ` de ${a.campos.toLowerCase()}` : ""} na ação "${a.acao}". Situação: ${a.status}.` });
    for (const s of p26.solicitacoes) marcos.push({ data: s.criadoEm, destaque: diaMes(s.criadoEm), texto: `Solicitou a nova ação "${s.titulo}". Situação: ${s.status}.` });
    for (const v of p26.validacoes) {
      const tecnico = /certifica/i.test(v.pdiTitulo);
      marcos.push({
        data: v.em,
        destaque: diaMes(v.em),
        texto: `${v.liderNome ?? "A liderança"} validou o ${tecnico ? "PDI técnico, criado depois da Avaliação de Proficiência" : `PDI "${v.pdiTitulo}"`}.${tecnico && p25?.aprovadoLider ? " O PDI comportamental foi aprovado no ciclo 2025." : ""}`,
      });
    }
    for (const a of acoes26) {
      const comp = semPrefixo(a.macro) || a.competencia || "";
      if (a.evidencia) {
        const atrasada = a.prazo && a.evidencia.entregueEm > a.prazo;
        const partes = [a.evidencia.oQue ? `Relato da evidência: “${resumir(a.evidencia.oQue, 220)}”` : "", a.evidencia.resultado ? `Resultado relatado: “${resumir(a.evidencia.resultado, 160)}”` : ""].filter(Boolean);
        marcos.push({
          data: a.evidencia.entregueEm,
          destaque: diaMes(a.evidencia.entregueEm),
          texto: `${comp ? `${comp} — ` : ""}${a.titulo}${atrasada ? " (entregue depois do prazo)" : ""}. ${partes.join(" ")}`.trim(),
        });
      } else {
        marcos.push({ data: a.prazo ?? "9999", destaque: a.prazo ? `prazo ${diaMes(a.prazo)}` : "sem prazo", texto: `${comp ? `${comp} — ` : ""}${a.titulo}: ${a.status === "concluida" ? "concluída, sem evidência registrada" : "ainda sem evidência entregue"}.` });
      }
    }
    marcos.sort((x, y) => x.data.localeCompare(y.data));
    cap4.push({ tipo: "lista", titulo: "O que aconteceu, em ordem", itens: marcos.map(({ destaque, texto }) => ({ destaque, texto })) });
    if (evidAprovadas.length) {
      cap4.push({
        tipo: "paragrafo",
        texto: `${evidAprovadas.length} de ${acoes26.length} evidências foram aprovadas${horas26 ? `, somando ${horas26} horas de desenvolvimento` : ""}${atrasadas26.length ? `; ${contagem(atrasadas26.length, "foi entregue", "foram entregues")} depois do prazo` : ""}.`,
      });
    }
  }

  // ---------- Capítulo 5 — hoje e o próximo capítulo ----------
  const cap5: Bloco[] = [];
  if (totalPlanejadas) {
    cap5.push({
      tipo: "paragrafo",
      texto: `${b.empregado.nome} concluiu ${totalConcluidas} de ${totalPlanejadas} ações ${ciclos.length === 2 ? "nos dois ciclos" : `no PDI ${ciclos[0]}`}.${atrasadas25.length && atrasadas26.length ? " Nos dois ciclos, parte das ações foi concluída depois da data combinada." : ""}`,
    });
  }
  const forcas: Array<{ texto: string }> = [];
  if (evoluiu.length) forcas.push({ texto: `${lista(evoluiu.map((c) => c.nome))} ${plural(evoluiu.length, "evoluiu", "evoluíram")} na ${AD2}.` });
  const naExpAD2 = ad2.filter((c) => naExpectativa(c.conceito) && !evoluiu.some((e) => e.nome === c.nome)).map((c) => c.nome);
  if (naExpAD2.length) forcas.push({ texto: `${lista(naExpAD2)} ${plural(naExpAD2.length, "está", "estão")} na expectativa.` });
  const potencial = b.tecnico.eixos.filter((e) => e.classificacao === "NAO_ESSENCIAL" && NIVEL[(e.atual ?? e.anterior) ?? "EM_DESENVOLVIMENTO"] >= NIVEL.CONSOLIDADO).map((e) => e.nome);
  if (potencial.length) forcas.push({ texto: `${lista(potencial)} ${plural(potencial.length, "aparece", "aparecem")} como potencialidade técnica, além das competências essenciais.` });
  const tecEvoluiu = b.tecnico.eixos.filter((e) => e.anterior && e.atual && NIVEL[e.atual] > NIVEL[e.anterior]).map((e) => e.nome);
  if (tecEvoluiu.length) forcas.push({ texto: `No técnico, ${lista(tecEvoluiu)} ${plural(tecEvoluiu.length, "evoluiu", "evoluíram")}.` });
  if (evidAprovadas.some((a) => /compartilh|equipe|colegas/i.test(`${a.evidencia?.oQue ?? ""} ${a.evidencia?.resultado ?? ""}`))) {
    forcas.push({ texto: "Em 2026, ações viraram resultado prático compartilhado com a equipe." });
  }
  if (forcas.length) cap5.push({ tipo: "lista", titulo: "Forças para reconhecer", itens: forcas });

  const proximos: Array<{ destaque?: string; texto: string }> = [];
  for (const c of abaixoAD2.length ? abaixoAD2 : AD2 ? [] : abaixoAD1) {
    const anos = anosTrabalhou(temaDaCompetencia(c.nome));
    proximos.push({
      destaque: `${c.nome}:`,
      texto: anos.includes("2025") && AD2
        ? `trabalhada no PDI 2025 e sem evolução na ${AD2}${anos.includes("2026") ? "; o PDI 2026 deu continuidade ao tema" : "; sem ação no PDI 2026"}. Vale conversar sobre prática acompanhada pela liderança, como feedback em situações reais de trabalho.`
        : anos.length
          ? `em desenvolvimento ${noPdi(anos)}. Acompanhar na próxima Avaliação de Desempenho.`
          : "ainda sem ação no PDI. Incluir no próximo PDI.",
    });
  }
  const tecFoco = b.tecnico.eixos.filter((e) => e.classificacao !== "NAO_ESSENCIAL" && (e.atual ?? e.anterior) === "EM_DESENVOLVIMENTO").map((e) => e.nome);
  if (b.tecnico.aguardandoProva) {
    proximos.push({ destaque: "Técnico:", texto: `os focos se ajustam com o resultado da Avaliação de Proficiência 2026, ainda não calculado.${tecFoco.length ? ` Na base, ${contagem(tecFoco.length, "eixo essencial ou transversal está", "eixos essenciais ou transversais estão")} no conceito Em Desenvolvimento.` : ""}` });
  } else if (tecFoco.length) {
    proximos.push({ destaque: "Técnico:", texto: `${lista(tecFoco.slice(0, 5))}${tecFoco.length > 5 ? ` e mais ${tecFoco.length - 5}` : ""} no conceito Em Desenvolvimento.` });
  }
  if (atrasadas25.length || atrasadas26.length) proximos.push({ destaque: "Prazos:", texto: "combinar marcos intermediários para evitar a concentração das entregas no fim do ciclo." });
  if (proximos.length) cap5.push({ tipo: "lista", titulo: "O próximo capítulo", itens: proximos });

  const capitulos: Capitulo[] = [
    { titulo: `Capítulo 1 — O ponto de partida${AD1 ? ` (${AD1.replace("AD", "Avaliação de Desempenho")})` : ""}`, blocos: cap1 },
    { titulo: "Capítulo 2 — PDI 2025: o que foi trabalhado e como", blocos: cap2 },
    { titulo: "Capítulo 3 — O que as avaliações mostraram depois do PDI 2025", blocos: cap3 },
    { titulo: "Capítulo 4 — PDI 2026: como foi trabalhado", blocos: cap4 },
    { titulo: "Capítulo 5 — Onde está hoje e o próximo capítulo", blocos: cap5 },
  ];

  // ---------- Linha do tempo ----------
  const eventos: Evento[] = [];
  if (anoAD1 !== null) eventos.push({ chave: "ad1", rotulo: `Avaliação de Desempenho ${anoAD1 + 1}`, inicio: `${anoAD1}-12-31`, fim: `${anoAD1}-12-31`, tipo: "AVALIACAO", detalhe: `ano de referência ${anoAD1}` });
  if (concl25.length) {
    const ini = p25!.areas.map((a) => a.criadoEm).filter((x): x is string => !!x).sort()[0] ?? concl25[0].concluidoEm!;
    eventos.push({ chave: "pdi2025", rotulo: `PDI 2025 · ${contagem(acoes25.length, "ação", "ações")}`, inicio: ini, fim: concl25[concl25.length - 1].concluidoEm!, tipo: "PDI", detalhe: "" });
  }
  if (an?.mes) eventos.push({ chave: "cert", rotulo: "Certificação Técnica", inicio: `${an.mes}-01`, fim: `${an.mes}-28`, tipo: "AVALIACAO", detalhe: "" });
  if (temDuasAD) eventos.push({ chave: "ad2", rotulo: `Avaliação de Desempenho ${anoAD2! + 1}`, inicio: `${anoAD2}-12-31`, fim: `${anoAD2}-12-31`, tipo: "AVALIACAO", detalhe: `ano de referência ${anoAD2}` });
  if (acoes26.length && p26.pdis.length) {
    const ini = p26.pdis.map((p) => p.criadoEm).sort()[0];
    const fins = acoes26.map((a) => a.evidencia?.entregueEm).filter((x): x is string => !!x).sort();
    eventos.push({ chave: "pdi2026", rotulo: `PDI 2026 · ${contagem(acoes26.length, "ação", "ações")}`, inicio: ini, fim: fins[fins.length - 1] ?? b.hoje, tipo: "PDI", detalhe: "" });
  }
  p26.validacoes.forEach((v, i) => {
    eventos.push({ chave: `valid${i}`, rotulo: /certifica/i.test(v.pdiTitulo) ? "Validação do PDI técnico pela liderança" : "Validação do PDI pela liderança", inicio: v.em, fim: v.em, tipo: "MARCO", detalhe: "" });
  });
  eventos.push({ chave: "hoje", rotulo: b.tecnico.aguardandoProva ? "Hoje · aguarda Proficiência 2026" : "Hoje", inicio: b.hoje, fim: b.hoje, tipo: "HOJE", detalhe: "" });

  // ---------- Anexo ----------
  const anexo: Tabela[] = [];
  if (acoes25.length) {
    anexo.push({
      titulo: "PDI 2025 — ações",
      colunas: ["Tipo", "Área de desenvolvimento", "Ação", "Prazo", "Concluída em"],
      linhas: [...acoes25]
        .sort((x, y) => (x.concluidoEm ?? "9").localeCompare(y.concluidoEm ?? "9"))
        .map((a) => [a.tipo === "COMPORTAMENTAL" ? "Comportamental" : a.tipo === "TECNICA" ? "Técnica" : "Integração", a.area ?? "—", limparTitulo(a.acao), dataBr(a.prazo), a.finalizada ? dataBr(a.concluidoEm) : "Pendente"]),
    });
  }
  if (acoes26.length) {
    anexo.push({
      titulo: "PDI 2026 — ações",
      colunas: ["Ação", "Competência", "Prazo", "Evidência entregue", "Horas", "Situação"],
      linhas: acoes26.map((a) => [
        a.titulo,
        semPrefixo(a.macro) || a.competencia || "—",
        dataBr(a.prazo),
        a.evidencia ? `${dataBr(a.evidencia.entregueEm)}${a.prazo && a.evidencia.entregueEm > a.prazo ? " (após o prazo)" : ""}` : "—",
        a.evidencia?.horas ? String(a.evidencia.horas) : "—",
        a.evidencia?.status === "aprovada" ? "Evidência aprovada" : a.status === "concluida" ? "Concluída" : "Em andamento",
      ]),
    });
  }
  if (ad1.length) {
    anexo.push({
      titulo: `Performance comportamental${AD2 ? `: ${AD1} → ${AD2}` : `: ${AD1}`}`,
      descricao: "Expectativa de desenvolvimento: Conhecimento Aplicado ou acima.",
      colunas: AD2 ? ["Competência", AD1!, AD2, "Evolução", "Expectativa"] : ["Competência", AD1!, "Expectativa"],
      linhas: (AD2 ? ad2 : ad1).map((c) => {
        const antes = conceitoEm(ad1, c.nome);
        const nome = `${c.nome}${c.transversal ? " (transversal)" : ""}`;
        if (!AD2) return [nome, ROTULO_CONCEITO[c.conceito], naExpectativa(c.conceito) ? "Atende" : "Abaixo"];
        return [nome, antes ? ROTULO_CONCEITO[antes] : "—", ROTULO_CONCEITO[c.conceito], antes ? (NIVEL[c.conceito] > NIVEL[antes] ? "Evoluiu" : "Não houve evolução") : "Primeira medição", naExpectativa(c.conceito) ? "Atende" : "Abaixo"];
      }),
    });
  }
  if (b.tecnico.eixos.length) {
    const grupo = (c: string | null) => (c === "TRANSVERSAL" ? "Transversal" : c === "NAO_ESSENCIAL" ? "Não essencial" : "Essencial");
    const ordem = (c: string | null) => (c === "TRANSVERSAL" ? 0 : c === "NAO_ESSENCIAL" ? 2 : 1);
    anexo.push({
      titulo: b.tecnico.aguardandoProva ? "Técnico — base da Avaliação de Proficiência 2025" : "Técnico — Avaliação de Proficiência 2025 → 2026",
      descricao: b.tecnico.aguardandoProva ? "A Avaliação de Proficiência 2026 ainda não tem resultado calculado." : undefined,
      colunas: b.tecnico.aguardandoProva ? ["Grupo", "Eixo", "Conceito na base"] : ["Grupo", "Eixo", "Base", "Atual", "Evolução"],
      linhas: [...b.tecnico.eixos]
        .sort((x, y) => ordem(x.classificacao) - ordem(y.classificacao) || x.nome.localeCompare(y.nome, "pt-BR"))
        .map((e) =>
          b.tecnico.aguardandoProva
            ? [grupo(e.classificacao), e.nome, e.anterior ? `${ROTULO_CONCEITO[e.anterior]}${e.classificacao === "NAO_ESSENCIAL" && NIVEL[e.anterior] >= NIVEL.CONSOLIDADO ? " (potencialidade)" : ""}` : "Sem medição na base"]
            : [grupo(e.classificacao), e.nome, e.anterior ? ROTULO_CONCEITO[e.anterior] : "—", e.atual ? ROTULO_CONCEITO[e.atual] : "—", e.anterior && e.atual ? (NIVEL[e.atual] > NIVEL[e.anterior] ? "Evoluiu" : "Não houve evolução") : "—"],
        ),
    });
  }
  const solicit: string[][] = [
    ...p26.ajustes.map((a) => [dataBr(a.criadoEm), "Ajuste de ação", `${a.acao}${a.campos ? ` (${a.campos})` : ""}`, a.status]),
    ...p26.solicitacoes.map((s) => [dataBr(s.criadoEm), "Nova ação", s.titulo, s.status]),
  ];
  anexo.push({
    titulo: "Solicitações feitas pelo empregado",
    colunas: ["Data", "Tipo", "Descrição", "Situação"],
    linhas: solicit.length ? solicit : [["—", "—", "Nenhuma solicitação de ajuste ou de nova ação.", "—"]],
  });

  return {
    titulo: `Relatório de PDI — ${b.empregado.nome}`,
    posicaoEm: b.hoje,
    identificacao,
    resumo: resumo.length ? resumo : [`${primeiroNome} ainda não tem PDI nem avaliações registradas na plataforma.`],
    linhaDoTempo: eventos,
    capitulos,
    anexo,
  };
}
