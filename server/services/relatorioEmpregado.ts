import { sql } from "drizzle-orm";
import { bloco1CompetenciasFuncaoRouter } from "../routers/bloco1CompetenciasFuncao";
import { conceitoDe, type BaseRelatorio, type TipoCompetencia } from "../../shared/relatorioEmpregadoRegras";
import { ensurePdi2025Tables, rowsOf } from "./pdi2025";

// Carrega tudo o que o relatório gerencial do empregado precisa, só leitura.
// Avaliação de Desempenho e técnico vêm da mesma montagem da Evolução Individual
// (bloco1CompetenciasFuncao.mapaIndividual), para os conceitos serem os mesmos das telas.

const dia = (v: unknown): string | null => {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  const t = String(v);
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null;
};

const STATUS_AJUSTE: Record<string, string> = {
  pendente: "em análise",
  aguardando_lider: "aguardando a liderança",
  mais_informacoes: "devolvida para mais informações",
  aprovada: "aprovada",
  reprovada: "não aprovada",
};
const STATUS_SOLICITACAO: Record<string, string> = {
  aguardando_ckm: "em análise pela CKM",
  aguardando_gestor: "aguardando a liderança",
  aguardando_rh: "aguardando o RH",
  aprovada: "aprovada",
  vetada_gestor: "não aprovada pela liderança",
  vetada_rh: "não aprovada pelo RH",
  em_revisao: "em revisão",
  encerrada_lider: "encerrada pela liderança",
  aguardando_solicitante: "aguardando o empregado",
};

// Lê a "Análise da Certificação Técnica" gravada no PDI (texto da CKM): data, classificação e pontos.
export function lerAnaliseCertificacao(texto: string | null | undefined) {
  if (!texto || !/certifica/i.test(texto)) return null;
  const linhas = texto.split(/\r?\n/).map((l) => l.trim());
  const limpar = (l: string) => l.replace(/^[^A-Za-zÀ-ÿ0-9]+/, "").trim();
  const ehCabecalho = (l: string) => /^\d️?⃣/.test(l) || /^🔹/.test(l) || /^[🔴🟡🔵🟢]\s*(curto|m[ée]dio|longo)/i.test(l);
  const secao = (titulo: RegExp) => {
    const i = linhas.findIndex((l) => titulo.test(l));
    if (i < 0) return [];
    const out: string[] = [];
    for (let j = i + 1; j < linhas.length; j++) {
      const l = linhas[j];
      if (!l) continue;
      if (ehCabecalho(l)) break;
      out.push(limpar(l));
    }
    return out.filter((l) => l && !/\d+[,.]?\d*\s*%/.test(l));
  };
  const mesM = texto.match(/Data da avalia[çc][ãa]o\s*:\s*(\d{1,2})\/(\d{4})/i);
  const iClass = linhas.findIndex((l) => /Classifica[çc][ãa]o T[ée]cnica/i.test(l));
  let classificacao: string | null = null;
  if (iClass >= 0) {
    const l = linhas.slice(iClass + 1).find((x) => x);
    classificacao = l ? limpar(l) : null;
  }
  return {
    mes: mesM ? `${mesM[2]}-${mesM[1].padStart(2, "0")}` : null,
    classificacao,
    consolidados: secao(/Pontos Consolidados/i),
    evolucao: secao(/Pontos de Evolu[çc][ãa]o/i),
  };
}

export async function carregarBaseRelatorio(db: any, ctx: any, colaboradorId: number, hoje: string): Promise<BaseRelatorio> {
  const caller = bloco1CompetenciasFuncaoRouter.createCaller(ctx);
  const mapa: any = await caller.mapaIndividual({ colaboradorId });

  const [lider] = rowsOf<any>(
    await db.execute(sql`
      SELECT l.name AS nome, l.cargo AS cargo
        FROM users u
        LEFT JOIN departamentos d ON d.id = u.departamentoId
        LEFT JOIN users l ON l.id = COALESCE(u.leaderId, d.leaderId)
       WHERE u.id = ${colaboradorId}
    `),
  );

  // Avaliação de Desempenho (conceitos já calculados na Evolução Individual).
  const ad = (mapa?.comportamental?.competencias ?? []).map((c: any) => {
    const anoAnt = Number(c.periodoAnterior);
    const anoAtu = Number(c.periodoAtual);
    const ant = conceitoDe(c.conceitoAnterior);
    const atu = conceitoDe(c.conceitoAtual);
    return {
      competencia: String(c.competenciaNome),
      transversal: /atua[çc][ãa]o colaborativa/i.test(String(c.competenciaNome)),
      anterior: ant && Number.isFinite(anoAnt) && anoAnt > 2000 ? { anoReferencia: anoAnt, conceito: ant } : null,
      atual: atu && Number.isFinite(anoAtu) && anoAtu > 2000 ? { anoReferencia: anoAtu, conceito: atu } : null,
    };
  });

  const tecnicas: any[] = mapa?.tecnico?.competencias ?? [];

  // PDIs de 2026 (não cancelados).
  const pdis = rowsOf<any>(
    await db.execute(sql`
      SELECT p.id, p.titulo, p.status, p.createdAt, p.relatorioAnalise
        FROM pdis p
        JOIN ciclos c ON c.id = p.cicloId
       WHERE p.colaboradorId = ${colaboradorId}
         AND p.status <> 'cancelado'
         AND (c.nome LIKE '%2026%' OR YEAR(c.dataInicio) = 2026 OR YEAR(c.dataFim) = 2026)
       ORDER BY p.createdAt
    `),
  );
  const pdiIds = pdis.map((p) => Number(p.id));
  const analise = pdis.map((p) => lerAnaliseCertificacao(p.relatorioAnalise)).find(Boolean) ?? null;

  let acoes: any[] = [];
  let evidencias: any[] = [];
  let ajustes: any[] = [];
  let solicitacoes: any[] = [];
  let validacoes: any[] = [];
  if (pdiIds.length) {
    const ids = sql.join(pdiIds.map((id) => sql`${id}`), sql`, `);
    acoes = rowsOf<any>(
      await db.execute(sql`
        SELECT a.id, a.pdiId, a.titulo, a.microcompetencia, a.prazo, a.status, m.nome AS macro
          FROM actions a
          LEFT JOIN competencias_macros m ON m.id = a.macroId
         WHERE a.pdiId IN (${ids}) AND a.status <> 'cancelada'
      `),
    );
    evidencias = rowsOf<any>(
      await db.execute(sql`
        SELECT e.actionId, e.status, e.createdAt, e.cargaHoraria, e.oQueRealizou, e.resultadoPratico
          FROM evidences e
          JOIN actions a ON a.id = e.actionId
         WHERE a.pdiId IN (${ids}) AND e.colaboradorId = ${colaboradorId}
         ORDER BY e.createdAt
      `),
    );
    ajustes = rowsOf<any>(
      await db.execute(sql`
        SELECT r.createdAt, r.status, r.camposAjustar, a.titulo
          FROM adjustment_requests r
          JOIN actions a ON a.id = r.actionId
         WHERE a.pdiId IN (${ids}) AND r.solicitanteId = ${colaboradorId}
         ORDER BY r.createdAt
      `),
    );
    solicitacoes = rowsOf<any>(
      await db.execute(sql`
        SELECT s.titulo, s.statusGeral, s.createdAt
          FROM solicitacoes_acoes s
         WHERE s.solicitanteId = ${colaboradorId} AND s.pdiId IN (${ids})
         ORDER BY s.createdAt
      `),
    );
    validacoes = rowsOf<any>(
      await db.execute(sql`
        SELECT v.aprovadoEm, u.name AS liderNome, p.titulo
          FROM pdi_validacoes v
          JOIN pdis p ON p.id = v.pdiId
          LEFT JOIN users u ON u.id = v.liderId
         WHERE v.pdiId IN (${ids})
         ORDER BY v.aprovadoEm
      `),
    );
  }

  // Evidência que vale para cada ação: a aprovada; sem ela, a mais recente.
  const evidPorAcao = new Map<number, any>();
  for (const e of evidencias) {
    const atual = evidPorAcao.get(Number(e.actionId));
    if (!atual || atual.status !== "aprovada") evidPorAcao.set(Number(e.actionId), e);
  }
  const tituloPdi = new Map(pdis.map((p) => [Number(p.id), String(p.titulo)]));

  // PDI 2025 (importado da planilha do ciclo 2025).
  await ensurePdi2025Tables(db);
  const [resumo25] = rowsOf<any>(await db.execute(sql`SELECT * FROM pdi_ciclo2025_resumo WHERE colaborador_id = ${colaboradorId} LIMIT 1`));
  const areas25 = resumo25 ? rowsOf<any>(await db.execute(sql`SELECT * FROM pdi_ciclo2025_areas WHERE colaborador_id = ${colaboradorId}`)) : [];
  const acoes25 = resumo25 ? rowsOf<any>(await db.execute(sql`SELECT * FROM pdi_ciclo2025_acoes WHERE colaborador_id = ${colaboradorId}`)) : [];
  const tipo25 = (t: unknown): TipoCompetencia | null => (t === "COMPORTAMENTAL" || t === "TECNICA" ? t : null);

  return {
    hoje,
    empregado: {
      nome: String(mapa?.empregado?.nome ?? ""),
      funcao: mapa?.empregado?.funcaoNome ?? null,
      cargo: mapa?.empregado?.cargo ? String(mapa.empregado.cargo).trim() : null,
      unidade: mapa?.empregado?.departamentoNome ?? null,
    },
    lider: lider?.nome ? { nome: String(lider.nome), cargo: lider.cargo ? String(lider.cargo).trim() : null } : null,
    ad,
    tecnico: {
      eixos: tecnicas.map((t) => ({
        nome: String(t.eixoNome),
        classificacao: t.classificacao ? String(t.classificacao).toUpperCase() : null,
        anterior: conceitoDe(t.conceitoAnterior),
        atual: t.statusAtual === "PROVA_2_CALCULADA" ? conceitoDe(t.conceitoAtual) : null,
      })),
      aguardandoProva: !tecnicas.some((t) => t.statusAtual === "PROVA_2_CALCULADA"),
      analise,
    },
    pdi2025: resumo25
      ? {
          aprovadoLider: resumo25.aprovado_lider ? /^sim/i.test(String(resumo25.aprovado_lider)) : null,
          areas: areas25.map((a) => ({ area: String(a.area), tipo: tipo25(a.tipo), competencia: a.competencia ?? null, criadoEm: dia(a.criado_em) })),
          acoes: acoes25.map((a) => ({
            acao: String(a.acao),
            area: a.area ?? null,
            tipo: tipo25(a.tipo),
            competencia: a.competencia ?? null,
            tipoAcao: a.tipo_acao ?? null,
            prazo: dia(a.prazo),
            concluidoEm: dia(a.concluido_em),
            finalizada: Number(a.finalizada) === 1,
          })),
        }
      : null,
    pdi2026: {
      pdis: pdis.map((p) => ({ titulo: String(p.titulo), criadoEm: dia(p.createdAt)!, status: String(p.status) })),
      acoes: acoes.map((a) => {
        const e = evidPorAcao.get(Number(a.id));
        return {
          titulo: String(a.titulo),
          macro: a.macro ?? null,
          competencia: a.microcompetencia ?? null,
          prazo: dia(a.prazo),
          status: String(a.status),
          pdiTitulo: tituloPdi.get(Number(a.pdiId)) ?? "",
          evidencia: e
            ? { entregueEm: dia(e.createdAt)!, status: String(e.status), horas: e.cargaHoraria === null ? null : Number(e.cargaHoraria), oQue: e.oQueRealizou ?? null, resultado: e.resultadoPratico ?? null }
            : null,
        };
      }),
      ajustes: ajustes.map((r) => {
        let campos: string | null = null;
        try {
          const j = JSON.parse(String(r.camposAjustar ?? ""));
          campos = Array.isArray(j?.camposSelecionados) ? j.camposSelecionados.join(", ") : null;
        } catch {
          campos = null;
        }
        return { acao: String(r.titulo), criadoEm: dia(r.createdAt)!, status: STATUS_AJUSTE[String(r.status)] ?? String(r.status), campos };
      }),
      solicitacoes: solicitacoes.map((s) => ({ titulo: String(s.titulo), criadoEm: dia(s.createdAt)!, status: STATUS_SOLICITACAO[String(s.statusGeral)] ?? String(s.statusGeral) })),
      validacoes: validacoes.map((v) => ({ em: dia(v.aprovadoEm)!, liderNome: v.liderNome ?? null, pdiTitulo: String(v.titulo) })),
    },
  };
}
