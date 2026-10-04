import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, assessmentProcedure, router } from "../_core/customTrpc";
import { sendEmail } from "../_core/email";
import { invokeLLM } from "../_core/llm";
import * as dbApi from "../db";
import { ensureTechnicalMatrixTables } from "../services/technicalMatrixSchema";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}


const RELACAO_TEXTO: Record<string, string> = {
  ESSENCIAL: "Essencial",
  TRANSVERSAL: "Transversal",
  NAO_ESSENCIAL: "Não essencial",
};
const textoRelacao = (valor: unknown) => RELACAO_TEXTO[String(valor ?? "")] ?? "Pendente de análise";

type GravacaoEixo = {
  matrizId: number;
  eixoId: string;
  eixo: string;
  relacao: "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL" | null;
  statusClassificacao: "CLASSIFICADO" | "PENDENTE";
  justificativa?: string | null;
  anterior: number | null;
  motivo: string;
  observacao?: string;
};

// Grava o eixo da matriz e registra a auditoria. Usado pela correção manual do admin
// e pela resposta às solicitações de reclassificação dos empregados.
async function gravarEixo(db: any, input: GravacaoEixo, usuarioId: number) {
  const anteriorResult = await db.execute(sql`
    SELECT eixo_nome AS eixo, relacao,
           status_classificacao AS statusClassificacao,
           justificativa, percentual_anterior AS anterior
      FROM prova_utic_matriz_eixos
     WHERE matriz_id = ${input.matrizId} AND eixo_id = ${input.eixoId}
     LIMIT 1
  `);
  const anterior = rowsOf<any>(anteriorResult)[0] ?? null;
  const novo = {
    eixo: input.eixo,
    relacao: input.relacao,
    statusClassificacao: input.statusClassificacao,
    justificativa: input.justificativa ?? null,
    anterior: input.anterior,
  };

  await db.execute(sql`
    INSERT INTO prova_utic_matriz_eixos
      (matriz_id, eixo_id, eixo_nome, relacao, status_classificacao, justificativa, percentual_anterior)
    VALUES
      (${input.matrizId}, ${input.eixoId}, ${input.eixo}, ${input.relacao},
       ${input.statusClassificacao}, ${input.justificativa ?? null}, ${input.anterior})
    ON DUPLICATE KEY UPDATE
      eixo_nome = VALUES(eixo_nome),
      relacao = VALUES(relacao),
      status_classificacao = VALUES(status_classificacao),
      justificativa = VALUES(justificativa),
      percentual_anterior = VALUES(percentual_anterior),
      updated_at = NOW()
  `);

  await db.execute(sql`
    UPDATE prova_utic_matrizes
       SET atualizado_por = ${usuarioId}, updated_at = NOW()
     WHERE id = ${input.matrizId}
  `);

  await db.execute(sql`
    INSERT INTO prova_utic_matriz_historico
      (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
    VALUES
      (${input.matrizId}, ${input.eixoId}, ${anterior ? JSON.stringify(anterior) : null},
       ${JSON.stringify(novo)}, ${input.motivo}, ${input.observacao ?? null}, ${usuarioId})
  `);
}

async function listarSolicitacoesDb(db: any, filtro: { colaboradorId?: number; status?: string }) {
  const result = await db.execute(sql`
    SELECT s.id, s.matriz_id AS matrizId, s.colaborador_id AS colaboradorId,
           u.name AS colaboradorNome, u.email AS colaboradorEmail, d.nome AS unidadeNome,
           s.eixo_id AS eixoId, s.eixo_nome AS eixo,
           s.relacao_atual AS relacaoAtual, s.relacao_solicitada AS relacaoSolicitada,
           s.justificativa, s.status, s.relacao_final AS relacaoFinal,
           s.resposta_admin AS respostaAdmin, s.respondido_em AS respondidoEm,
           r.name AS respondidoPorNome, s.created_at AS createdAt
      FROM prova_utic_eixo_solicitacoes s
      JOIN users u ON u.id = s.colaborador_id
      LEFT JOIN departamentos d ON d.id = u.departamentoId
      LEFT JOIN users r ON r.id = s.respondido_por
     WHERE (${filtro.colaboradorId ?? null} IS NULL OR s.colaborador_id = ${filtro.colaboradorId ?? null})
       AND (${filtro.status ?? null} IS NULL OR s.status = ${filtro.status ?? null})
     ORDER BY (s.status = 'PENDENTE') DESC, s.created_at DESC, s.id DESC
  `);
  return rowsOf<any>(result);
}

async function notificarAdminsSolicitacao(params: {
  colaboradorNome: string;
  unidadeNome: string | null;
  eixo: string;
  relacaoAtual: string | null;
  relacaoSolicitada: string;
  justificativa: string;
  solicitacaoId: number;
}) {
  const admins = await dbApi.getUsersByRole("admin");
  const titulo = "Solicitação de reclassificação de eixo técnico";
  const mensagem = `${params.colaboradorNome} solicitou reclassificar o eixo "${params.eixo}" de ${textoRelacao(params.relacaoAtual)} para ${textoRelacao(params.relacaoSolicitada)}.`;
  const corpo = `
Prezado(a) Administrador(a),

${params.colaboradorNome}${params.unidadeNome ? ` (${params.unidadeNome})` : ""} solicitou a reclassificação de um eixo técnico.

Eixo: ${params.eixo}
Classificação atual: ${textoRelacao(params.relacaoAtual)}
Classificação solicitada: ${textoRelacao(params.relacaoSolicitada)}

Justificativa do empregado:
${params.justificativa}

Para analisar, acesse https://pdi.ecodobem.com/admin-eixos-tecnicos (Avaliações > Eixos Técnicos por Empregado).

⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA ⚠️
  `.trim();

  for (const admin of admins as any[]) {
    if (String(admin.status ?? "ativo") !== "ativo") continue;
    try {
      await dbApi.createNotification({ destinatarioId: admin.id, tipo: "eixo_reclassificacao_solicitada", titulo, mensagem, referenciaId: params.solicitacaoId });
    } catch (error) {
      console.warn("[Eixos] Falha ao criar notificação para admin", admin.id, error);
    }
    if (admin.email) {
      await sendEmail({ to: admin.email, subject: `AÇÃO NECESSÁRIA — Reclassificação de eixo técnico — ${params.colaboradorNome}`, body: corpo });
    }
  }
}

async function notificarEmpregadoResposta(params: {
  colaboradorId: number;
  colaboradorNome: string;
  colaboradorEmail: string | null;
  eixo: string;
  decisao: "AJUSTADA" | "MANTIDA";
  relacaoFinal: string | null;
  resposta: string;
  solicitacaoId: number;
}) {
  const ajustada = params.decisao === "AJUSTADA";
  const titulo = ajustada ? "Eixo técnico reclassificado" : "Classificação de eixo técnico mantida";
  const mensagem = ajustada
    ? `Sua solicitação foi aceita: o eixo "${params.eixo}" agora é ${textoRelacao(params.relacaoFinal)}. A sua Evolução já considera a nova classificação.`
    : `Sua solicitação para o eixo "${params.eixo}" foi analisada e a classificação ${textoRelacao(params.relacaoFinal)} foi mantida.`;
  try {
    await dbApi.createNotification({ destinatarioId: params.colaboradorId, tipo: "eixo_reclassificacao_respondida", titulo, mensagem, referenciaId: params.solicitacaoId });
  } catch (error) {
    console.warn("[Eixos] Falha ao criar notificação para empregado", params.colaboradorId, error);
  }
  if (!params.colaboradorEmail) return;
  const corpo = `
Prezado(a) ${params.colaboradorNome},

${mensagem}

Resposta da administração:
${params.resposta}

Consulte em https://pdi.ecodobem.com/meus-eixos-tecnicos (Avaliações > Meus Eixos Técnicos).

⚠️ NÃO RESPONDA ESTE EMAIL - O FLUXO É VIA SISTEMA ⚠️
  `.trim();
  await sendEmail({ to: params.colaboradorEmail, subject: `PARA A SUA CIÊNCIA — ${titulo}`, body: corpo });
}

export const provaUticMatrizRouter = router({
  listar: adminProcedure.query(async () => {
    const db = await ensureTechnicalMatrixTables();
    const matrizesResult = await db.execute(sql`
      SELECT m.id, m.colaborador_id AS colaboradorId, u.name AS colaboradorNome,
             u.email, u.cargo, u.departamentoId, d.nome AS unidadeNome,
             m.status, m.fonte, m.observacao,
             m.created_at AS createdAt, m.updated_at AS updatedAt
        FROM prova_utic_matrizes m
        JOIN users u ON u.id = m.colaborador_id
        LEFT JOIN departamentos d ON d.id = u.departamentoId
       ORDER BY COALESCE(d.nome, ''), u.name
    `);
    const matrizes = rowsOf<any>(matrizesResult);

    for (const matriz of matrizes) {
      const eixosResult = await db.execute(sql`
        SELECT e.id, e.eixo_id AS eixoId, e.eixo_nome AS eixo,
               e.relacao, e.status_classificacao AS statusClassificacao,
               e.justificativa, e.percentual_anterior AS anterior,
               c.descricao AS eixoDescricao,
               c.conhecimentos_json AS conhecimentosJson
          FROM prova_utic_matriz_eixos e
          LEFT JOIN prova_utic_eixo_catalogo c ON c.eixo_id = e.eixo_id
         WHERE e.matriz_id = ${matriz.id}
         ORDER BY e.id
      `);
      matriz.eixos = rowsOf<any>(eixosResult).map((eixo) => {
        let conhecimentos: string[] = [];
        try { conhecimentos = JSON.parse(String(eixo.conhecimentosJson || "[]")); } catch {}
        return {
          ...eixo,
          anterior: eixo.anterior === null ? null : Number(eixo.anterior),
          conhecimentos,
        };
      });
    }

    const pendentesResult = await db.execute(sql`
      SELECT matriz_id AS matrizId, COUNT(*) AS total
        FROM prova_utic_eixo_solicitacoes
       WHERE status = 'PENDENTE'
       GROUP BY matriz_id
    `);
    const pendentes = new Map(rowsOf<any>(pendentesResult).map((item) => [Number(item.matrizId), Number(item.total)]));
    for (const matriz of matrizes) matriz.solicitacoesPendentes = pendentes.get(Number(matriz.id)) ?? 0;

    return matrizes;
  }),

  // Eixos técnicos com pontuação histórica, por unidade do empregado.
  // A consolidação é feita em memória para evitar uma consulta derivada complexa
  // e dar precedência à matriz individual sobre o histórico regional antigo.
  listarPorDepartamento: adminProcedure.query(async () => {
    const db = await ensureTechnicalMatrixTables();

    const [historicoResult, matrizesResult, usuariosResult, departamentosResult] = await Promise.all([
      db.execute(sql`
        SELECT colaborador_id AS colaboradorId,
               eixo_chave AS eixoChave,
               eixo_nome AS eixoNome,
               percentual_original AS pontuacao
          FROM registro_historico_proficiencia_eixos
      `),
      db.execute(sql`
        SELECT m.colaborador_id AS colaboradorId,
               LOWER(TRIM(e.eixo_nome)) AS eixoChave,
               e.eixo_nome AS eixoNome,
               e.percentual_anterior AS pontuacao
          FROM prova_utic_matrizes m
          JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
      `),
      db.execute(sql`
        SELECT id, departamentoId
          FROM users
      `),
      db.execute(sql`
        SELECT id, nome, leaderId, status
          FROM departamentos
      `),
    ]);

    const historico = rowsOf<any>(historicoResult);
    const matrizes = rowsOf<any>(matrizesResult);
    const usuarios = rowsOf<any>(usuariosResult);
    const departamentos = rowsOf<any>(departamentosResult);

    // A matriz individual tem precedência sobre o histórico regional antigo.
    const colaboradoresComMatriz = new Set(matrizes.map((item) => Number(item.colaboradorId)));
    const base = [
      ...matrizes,
      ...historico.filter((item) => !colaboradoresComMatriz.has(Number(item.colaboradorId))),
    ];

    const usuarioPorId = new Map(usuarios.map((item) => [Number(item.id), item]));
    const departamentoPorId = new Map(departamentos.map((item) => [Number(item.id), item]));
    const unidadeLideradaPorUsuario = new Map<number, string>();
    for (const departamento of departamentos) {
      if (departamento.leaderId && String(departamento.status ?? "ativo") === "ativo" && !unidadeLideradaPorUsuario.has(Number(departamento.leaderId))) {
        unidadeLideradaPorUsuario.set(Number(departamento.leaderId), String(departamento.nome));
      }
    }

    // Departamentos de apoio que, nos painéis, são consolidados na unidade à qual pertencem
    // (ex.: a Secretaria da DIREX tem líder administrativo em outra unidade, mas compõe a DIREX).
    const UNIDADE_CONSOLIDADA: Record<string, string> = {
      "SECRETARIA DIREX": "DIREX - UNIDADE DIRETORIA EXECUTIVA",
    };
    const unidadeDoColaborador = (colaboradorId: number) => {
      const liderada = unidadeLideradaPorUsuario.get(colaboradorId);
      if (liderada) return liderada;
      const usuario = usuarioPorId.get(colaboradorId);
      const departamento = usuario?.departamentoId ? departamentoPorId.get(Number(usuario.departamentoId)) : null;
      const nome = String(departamento?.nome ?? "Sem unidade");
      return UNIDADE_CONSOLIDADA[nome.trim().toUpperCase()] ?? nome;
    };

    const empregadosPorUnidade = new Map<string, Set<number>>();
    const agregados = new Map<string, Map<string, any>>();

    for (const item of base) {
      const colaboradorId = Number(item.colaboradorId);
      const unidadeNome = unidadeDoColaborador(colaboradorId);
      const eixoId = String(item.eixoChave ?? "").trim();
      const eixoNome = String(item.eixoNome ?? "").trim();
      if (!eixoId || !eixoNome) continue;

      if (!empregadosPorUnidade.has(unidadeNome)) empregadosPorUnidade.set(unidadeNome, new Set());
      empregadosPorUnidade.get(unidadeNome)!.add(colaboradorId);

      if (!agregados.has(unidadeNome)) agregados.set(unidadeNome, new Map());
      const porEixo = agregados.get(unidadeNome)!;
      const atual = porEixo.get(eixoId) ?? {
        eixoId,
        eixo: eixoNome,
        empregados: new Set<number>(),
        valores: [] as number[],
      };
      atual.empregados.add(colaboradorId);
      if (item.pontuacao !== null && item.pontuacao !== undefined && item.pontuacao !== "") {
        const valor = Number(item.pontuacao);
        if (Number.isFinite(valor)) atual.valores.push(valor);
      }
      porEixo.set(eixoId, atual);
    }

    return Array.from(agregados.entries())
      .map(([unidadeNome, porEixo]) => ({
        unidadeNome,
        totalEmpregados: empregadosPorUnidade.get(unidadeNome)?.size ?? 0,
        eixos: Array.from(porEixo.values())
          .map((item) => {
            const somaPontuacao = item.valores.reduce((soma: number, valor: number) => soma + valor, 0);
            return {
              eixoId: item.eixoId,
              eixo: item.eixo,
              totalEmpregados: item.empregados.size,
              qtdPontuacao: item.valores.length,
              somaPontuacao,
              mediaPontuacao: item.valores.length ? Number((somaPontuacao / item.valores.length).toFixed(2)) : null,
              menorPontuacao: item.valores.length ? Math.min(...item.valores) : null,
              maiorPontuacao: item.valores.length ? Math.max(...item.valores) : null,
            };
          })
          .sort((a, b) => String(a.eixo).localeCompare(String(b.eixo), "pt-BR")),
      }))
      .sort((a, b) => a.unidadeNome.localeCompare(b.unidadeNome, "pt-BR"));
  }),

  listarHistorico: adminProcedure
    .input(z.object({ matrizId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await ensureTechnicalMatrixTables();
      const result = await db.execute(sql`
        SELECT h.id, h.eixo_id AS eixoId,
               h.valor_anterior AS valorAnterior,
               h.valor_novo AS valorNovo,
               h.motivo, h.observacao,
               h.created_at AS createdAt,
               u.name AS alteradoPorNome
          FROM prova_utic_matriz_historico h
          JOIN users u ON u.id = h.alterado_por
         WHERE h.matriz_id = ${input.matrizId}
         ORDER BY h.created_at DESC, h.id DESC
      `);

      return rowsOf<any>(result).map((item) => {
        const parseJson = (valor: string | null) => {
          if (!valor) return null;
          try { return JSON.parse(valor); } catch { return valor; }
        };
        return {
          ...item,
          valorAnterior: parseJson(item.valorAnterior),
          valorNovo: parseJson(item.valorNovo),
        };
      });
    }),

  salvarEixo: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      eixoId: z.string().min(1).max(40),
      eixo: z.string().min(1).max(255),
      relacao: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"]).nullable(),
      statusClassificacao: z.enum(["CLASSIFICADO", "PENDENTE"]),
      justificativa: z.string().max(5000).nullable().optional(),
      anterior: z.number().min(0).max(100).nullable(),
      motivo: z.string().min(3).max(255),
      observacao: z.string().max(1000).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.statusClassificacao === "CLASSIFICADO" && !input.relacao) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Classificação obrigatória quando o eixo está classificado." });
      }
      if (input.statusClassificacao === "PENDENTE" && input.relacao) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Eixo pendente não deve possuir classificação final." });
      }

      const db = await ensureTechnicalMatrixTables();
      await gravarEixo(db, input, ctx.user.id);
      return { salvo: true };
    }),

  atualizarStatus: adminProcedure
    .input(z.object({
      matrizId: z.number().int().positive(),
      status: z.enum(["VALIDADA_PROVISORIA", "VALIDADA_DEFINITIVA", "PENDENTE_HISTORICO"]),
      fonte: z.string().max(2000).nullable().optional(),
      observacao: z.string().max(2000).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTechnicalMatrixTables();
      const anteriorResult = await db.execute(sql`
        SELECT status, fonte, observacao
          FROM prova_utic_matrizes
         WHERE id = ${input.matrizId}
         LIMIT 1
      `);
      const anterior = rowsOf<any>(anteriorResult)[0];
      if (!anterior) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Matriz do empregado não encontrada." });
      }

      const novo = {
        status: input.status,
        fonte: input.fonte ?? null,
        observacao: input.observacao ?? null,
      };
      if (
        anterior.status === novo.status &&
        (anterior.fonte ?? null) === novo.fonte &&
        (anterior.observacao ?? null) === novo.observacao
      ) return { atualizado: false };

      await db.execute(sql`
        UPDATE prova_utic_matrizes
           SET status = ${input.status},
               fonte = ${input.fonte ?? null},
               observacao = ${input.observacao ?? null},
               atualizado_por = ${ctx.user.id},
               updated_at = NOW()
         WHERE id = ${input.matrizId}
      `);

      await db.execute(sql`
        INSERT INTO prova_utic_matriz_historico
          (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
        VALUES
          (${input.matrizId}, NULL, ${JSON.stringify(anterior)}, ${JSON.stringify(novo)},
           'Atualização da situação geral da matriz', ${input.observacao ?? null}, ${ctx.user.id})
      `);

      return { atualizado: true };
    }),

  // ===== Visão do empregado =====
  // Mostra apenas classificação, situação e justificativa (sem pontuação histórica).
  meusEixos: assessmentProcedure.query(async ({ ctx }) => {
    const db = await ensureTechnicalMatrixTables();
    const matrizResult = await db.execute(sql`
      SELECT m.id, m.status, u.name AS colaboradorNome, u.cargo, d.nome AS unidadeNome
        FROM prova_utic_matrizes m
        JOIN users u ON u.id = m.colaborador_id
        LEFT JOIN departamentos d ON d.id = u.departamentoId
       WHERE m.colaborador_id = ${ctx.user.id}
       LIMIT 1
    `);
    const matriz = rowsOf<any>(matrizResult)[0] ?? null;
    if (!matriz) return { matriz: null, eixos: [], solicitacoes: [] };

    const eixosResult = await db.execute(sql`
      SELECT e.eixo_id AS eixoId, e.eixo_nome AS eixo, e.relacao,
             e.status_classificacao AS statusClassificacao, e.justificativa,
             c.descricao AS eixoDescricao,
             c.conhecimentos_json AS conhecimentosJson
        FROM prova_utic_matriz_eixos e
        LEFT JOIN prova_utic_eixo_catalogo c ON c.eixo_id = e.eixo_id
       WHERE e.matriz_id = ${matriz.id}
       ORDER BY e.id
    `);
    const solicitacoes = await listarSolicitacoesDb(db, { colaboradorId: ctx.user.id });
    return {
      matriz,
      eixos: rowsOf<any>(eixosResult).map((eixo) => {
        let conhecimentos: string[] = [];
        try { conhecimentos = JSON.parse(String(eixo.conhecimentosJson || "[]")); } catch {}
        return { ...eixo, conhecimentos };
      }),
      solicitacoes: solicitacoes.map(({ colaboradorEmail, ...resto }: any) => resto),
    };
  }),

  solicitarReclassificacao: assessmentProcedure
    .input(z.object({
      eixoId: z.string().min(1).max(40),
      relacaoSolicitada: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"]),
      justificativa: z.string().trim().min(20, "Descreva a justificativa com pelo menos 20 caracteres.").max(3000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTechnicalMatrixTables();
      const eixoResult = await db.execute(sql`
        SELECT m.id AS matrizId, e.eixo_nome AS eixo, e.relacao,
               u.name AS colaboradorNome, d.nome AS unidadeNome
          FROM prova_utic_matrizes m
          JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
          JOIN users u ON u.id = m.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
         WHERE m.colaborador_id = ${ctx.user.id} AND e.eixo_id = ${input.eixoId}
         LIMIT 1
      `);
      const eixo = rowsOf<any>(eixoResult)[0];
      if (!eixo) throw new TRPCError({ code: "NOT_FOUND", message: "Eixo técnico não encontrado na sua matriz." });
      if (eixo.relacao === input.relacaoSolicitada) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este eixo já possui a classificação solicitada." });
      }
      const pendenteResult = await db.execute(sql`
        SELECT id FROM prova_utic_eixo_solicitacoes
         WHERE colaborador_id = ${ctx.user.id} AND eixo_id = ${input.eixoId} AND status = 'PENDENTE'
         LIMIT 1
      `);
      if (rowsOf<any>(pendenteResult).length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma solicitação em análise para este eixo." });
      }

      const insertResult: any = await db.execute(sql`
        INSERT INTO prova_utic_eixo_solicitacoes
          (matriz_id, colaborador_id, eixo_id, eixo_nome, relacao_atual, relacao_solicitada, justificativa)
        VALUES
          (${eixo.matrizId}, ${ctx.user.id}, ${input.eixoId}, ${eixo.eixo}, ${eixo.relacao ?? null},
           ${input.relacaoSolicitada}, ${input.justificativa})
      `);
      const solicitacaoId = Number(insertResult?.[0]?.insertId ?? insertResult?.insertId ?? 0);

      try {
        await notificarAdminsSolicitacao({
          colaboradorNome: eixo.colaboradorNome,
          unidadeNome: eixo.unidadeNome ?? null,
          eixo: eixo.eixo,
          relacaoAtual: eixo.relacao ?? null,
          relacaoSolicitada: input.relacaoSolicitada,
          justificativa: input.justificativa,
          solicitacaoId,
        });
      } catch (error) {
        console.warn("[Eixos] Falha ao notificar administradores", error);
      }
      return { solicitacaoId };
    }),

  // ===== Visão do administrador =====
  listarSolicitacoes: adminProcedure
    .input(z.object({ status: z.enum(["PENDENTE", "AJUSTADA", "MANTIDA"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await ensureTechnicalMatrixTables();
      return listarSolicitacoesDb(db, { status: input?.status });
    }),

  gerarCatalogoEixos: adminProcedure.mutation(async ({ ctx }) => {
    const db = await ensureTechnicalMatrixTables();

    const normalizarNome = (valor: string) =>
      valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

    // 1) Lê todas as questões e organiza o conteúdo por NOME do eixo.
    // O catálogo precisa depois ser gravado com o eixo_id REAL da matriz individual.
    const provasResult = await db.execute(sql`
      SELECT id, nome, codigo, unidade, ano, questoes_json AS questoesJson
        FROM provas_importadas
       WHERE questoes_json IS NOT NULL
         AND TRIM(questoes_json) <> ''
       ORDER BY ano, id
    `);
    const provas = rowsOf<any>(provasResult);
    const conteudoPorNome = new Map<string, { enunciados: Set<string>; fontes: Set<string>; nomeFonte: string }>();

    for (const prova of provas) {
      let questoes: any[] = [];
      try { questoes = JSON.parse(String(prova.questoesJson || "[]")); } catch { questoes = []; }

      for (const questao of Array.isArray(questoes) ? questoes : []) {
        const enunciado = String(questao?.enunciado ?? questao?.pergunta ?? "").replace(/\s+/g, " ").trim();
        const eixosQuestao = Array.isArray(questao?.eixos)
          ? questao.eixos
          : questao?.eixo
            ? [{ id: questao?.eixoId, nome: questao?.eixo }]
            : [];

        for (const eixo of eixosQuestao) {
          const nome = String(eixo?.nome ?? eixo?.eixo ?? "").trim();
          if (!nome) continue;
          const chave = normalizarNome(nome);
          if (!chave) continue;

          if (!conteudoPorNome.has(chave)) {
            conteudoPorNome.set(chave, { enunciados: new Set(), fontes: new Set(), nomeFonte: nome });
          }
          const item = conteudoPorNome.get(chave)!;
          if (enunciado) item.enunciados.add(enunciado);
          item.fontes.add(`${prova.codigo || prova.nome || "Prova"} ${prova.ano || ""}`.trim());
        }
      }
    }

    // 2) Usa os IDs REAIS existentes nas matrizes individuais.
    const eixosMatrizResult = await db.execute(sql`
      SELECT DISTINCT eixo_id AS eixoId, eixo_nome AS eixoNome
        FROM prova_utic_matriz_eixos
       WHERE eixo_id IS NOT NULL
         AND TRIM(eixo_id) <> ''
         AND eixo_nome IS NOT NULL
         AND TRIM(eixo_nome) <> ''
       ORDER BY eixo_nome
    `);
    const eixosMatriz = rowsOf<any>(eixosMatrizResult);

    let salvos = 0;
    let semConteudo = 0;

    for (const eixoMatriz of eixosMatriz) {
      const eixoId = String(eixoMatriz.eixoId).trim();
      const eixoNome = String(eixoMatriz.eixoNome).trim();
      const chave = normalizarNome(eixoNome);
      const conteudo = conteudoPorNome.get(chave);

      const conhecimentos = conteudo
        ? Array.from(conteudo.enunciados)
            .filter(Boolean)
            .slice(0, 30)
            .map((texto) => texto.length > 480 ? `${texto.slice(0, 477)}...` : texto)
        : [];

      if (conhecimentos.length === 0) {
        semConteudo++;
        continue;
      }

      const descricao =
        `Eixo de conhecimento "${eixoNome}", definido a partir das questões técnicas vinculadas a este eixo nas avaliações cadastradas. ` +
        "Os conhecimentos abrangidos abaixo reproduzem o escopo efetivamente avaliado, sem acrescentar conteúdo externo.";

      await db.execute(sql`
        INSERT INTO prova_utic_eixo_catalogo
          (eixo_id, eixo_nome, descricao, conhecimentos_json, fonte, atualizado_por)
        VALUES
          (${eixoId}, ${eixoNome}, ${descricao}, ${JSON.stringify(conhecimentos)},
           ${`Questões vinculadas ao eixo em: ${Array.from(conteudo!.fontes).join("; ")}`}, ${ctx.user.id})
        ON DUPLICATE KEY UPDATE
          eixo_nome = VALUES(eixo_nome),
          descricao = VALUES(descricao),
          conhecimentos_json = VALUES(conhecimentos_json),
          fonte = VALUES(fonte),
          atualizado_por = VALUES(atualizado_por),
          updated_at = NOW()
      `);
      salvos++;
    }

    return {
      eixosMatriz: eixosMatriz.length,
      salvos,
      semConteudo,
      mensagem:
        semConteudo > 0
          ? `${salvos} eixo(s) preparados com o ID real da matriz; ${semConteudo} eixo(s) ainda não possuem questões vinculadas por nome.`
          : `${salvos} eixo(s) preparados com o ID real da matriz.`,
    };
  }),

  analisarQuestionarioEmpregado: adminProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTechnicalMatrixTables();

      const matrizResult = await db.execute(sql`
        SELECT m.id AS matrizId, m.colaborador_id AS colaboradorId,
               u.name AS colaboradorNome, d.nome AS unidadeNome
          FROM prova_utic_matrizes m
          JOIN users u ON u.id = m.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
         WHERE m.colaborador_id = ${input.colaboradorId}
         LIMIT 1
      `);
      const matriz = rowsOf<any>(matrizResult)[0];
      if (!matriz) throw new TRPCError({ code: "NOT_FOUND", message: "Matriz técnica do empregado não encontrada." });

      const questionarioResult = await db.execute(sql`
        SELECT id, ano, versao, status
          FROM questionarios_atividades_funcao
         WHERE colaborador_id = ${input.colaboradorId}
         ORDER BY ano DESC, versao DESC, id DESC
         LIMIT 1
      `);
      const questionario = rowsOf<any>(questionarioResult)[0];
      if (!questionario) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Questionário de Atividades/Função não localizado para este empregado." });

      const respostasResult = await db.execute(sql`
        SELECT chave, pergunta, resposta, ordem
          FROM questionario_atividades_respostas
         WHERE questionario_id = ${questionario.id}
           AND resposta IS NOT NULL
           AND TRIM(resposta) <> ''
         ORDER BY ordem, id
      `);
      const respostas = rowsOf<any>(respostasResult);
      if (respostas.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "O questionário não possui respostas disponíveis para análise." });

      const eixosResult = await db.execute(sql`
        SELECT e.eixo_id AS eixoId, e.eixo_nome AS eixo,
               e.relacao AS relacaoAtual, e.justificativa AS justificativaAtual,
               e.percentual_anterior AS percentualAnterior,
               c.descricao, c.conhecimentos_json AS conhecimentosJson
          FROM prova_utic_matriz_eixos e
          LEFT JOIN prova_utic_eixo_catalogo c ON c.eixo_id = e.eixo_id
         WHERE e.matriz_id = ${matriz.matrizId}
         ORDER BY e.id
      `);
      const eixos = rowsOf<any>(eixosResult).map((item) => {
        let conhecimentos: string[] = [];
        try { conhecimentos = JSON.parse(String(item.conhecimentosJson || "[]")); } catch {}
        return { ...item, conhecimentos };
      });
      if (eixos.length === 0) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Este empregado não possui eixos técnicos cadastrados." });
      }

      const semCatalogo = eixos.filter((e) => !e.descricao || e.conhecimentos.length === 0);
      if (semCatalogo.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Existem ${semCatalogo.length} eixo(s) sem descrição/conhecimentos no catálogo. Prepare o catálogo antes da análise.`,
        });
      }

      const questionarioTexto = respostas
        .map((r: any) => `[${r.chave}] ${r.pergunta}\nResposta: ${r.resposta}`)
        .join("\n\n");
      const eixosTexto = eixos
        .map((e: any) =>
          `EIXO_ID=${e.eixoId}\nNome: ${e.eixo}\nClassificação atual: ${e.relacaoAtual || "PENDENTE"}\nDescrição: ${e.descricao}\nConhecimentos avaliados: ${e.conhecimentos.join("; ")}`
        )
        .join("\n\n---\n\n");

      const resposta = await invokeLLM({
        maxTokens: 7000,
        messages: [
          {
            role: "system",
            content:
              "Você é especialista em arquitetura de competências e análise de função. Analise UM EMPREGADO POR VEZ. Use SOMENTE as respostas do Questionário de Atividades/Função desse empregado e o catálogo dos eixos fornecidos. Não use cargo, unidade, senso comum, internet, normas externas ou suposições. ESSENCIAL = conhecimento diretamente necessário e recorrente para executar responsabilidades centrais declaradas. TRANSVERSAL = conhecimento útil ou recorrente que apoia diversas atividades, mas não constitui o núcleo das entregas declaradas. NAO_ESSENCIAL = não há evidência suficiente de uso relevante nas atividades declaradas. Se houver ambiguidade ou evidência insuficiente para mudar, mantenha a classificação atual. Para cada eixo gere uma descricaoEixo conceitual, de 2 a 4 frases, explicando o que o eixo é e os conhecimentos que abrange, usando EXCLUSIVAMENTE as questões/conhecimentos do catálogo, sem usar o questionário do empregado. Gere também conhecimentosEixo como uma lista curta de 4 a 10 tópicos conceituais, sem copiar enunciados inteiros das questões. A JUSTIFICATIVA É INDIVIDUAL e deve responder: por que ESTE eixo é essencial, transversal ou não essencial para a função DESTE empregado, segundo o que ELE declarou no questionário. A justificativa NÃO pode ser genérica, NÃO pode apenas definir o eixo e NÃO pode usar frases vagas como 'é importante para a função'. Ela deve mencionar de forma concreta uma ou mais atividades, responsabilidades, entregas, desafios ou conhecimentos declarados pelo empregado. Prefira formulações como 'No seu Questionário de Atividades/Função, você informou que...' e conecte essa evidência diretamente ao eixo. Para ESSENCIAL, identifique a atividade central que depende do eixo. Para TRANSVERSAL, identifique em que atividades o eixo atua como apoio. Para NAO_ESSENCIAL, explique que as atividades centrais declaradas não demonstram uso relevante do eixo e cite quais respostas sustentam essa conclusão. Cite somente chaves de respostas realmente utilizadas.",
          },
          {
            role: "user",
            content:
              `QUESTIONÁRIO DO EMPREGADO ANALISADO:\n${questionarioTexto}\n\nEIXOS E CLASSIFICAÇÕES ATUAIS:\n${eixosTexto}\n\nAnalise TODOS os eixos deste empregado. Para cada eixo retorne: (1) descricaoEixo, explicando o que o eixo é com base somente nas questões/conhecimentos do catálogo; (2) conhecimentosEixo, com 4 a 10 tópicos conceituais resumidos, sem repetir enunciados completos; (3) classificação sugerida; (4) justificativa INDIVIDUAL, em 2 a 5 frases, explicando por que essa classificação se aplica a ESTE empregado e mencionando atividades/responsabilidades concretas que ELE declarou no questionário; e (5) as chaves das respostas utilizadas como evidência. Se a classificação atual estiver correta, mantenha-a, mas substitua justificativas genéricas por uma justificativa individual ancorada nas respostas do empregado. Não confunda descrição do eixo com justificativa da função.`,
          },
        ],
        responseFormat: {
          type: "json_schema",
          json_schema: {
            name: "analise_eixos_questionario",
            strict: true,
            schema: {
              type: "object",
              properties: {
                eixos: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      eixoId: { type: "string" },
                      descricaoEixo: { type: "string" },
                      conhecimentosEixo: { type: "array", items: { type: "string" } },
                      relacaoSugerida: { type: "string", enum: ["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"] },
                      justificativa: { type: "string" },
                      evidencias: { type: "array", items: { type: "string" } },
                    },
                    required: ["eixoId", "descricaoEixo", "conhecimentosEixo", "relacaoSugerida", "justificativa", "evidencias"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["eixos"],
              additionalProperties: false,
            },
          },
        },
      });

      const texto = resposta.choices?.[0]?.message?.content;
      const bruto = typeof texto === "string"
        ? texto
        : Array.isArray(texto)
          ? texto.map((p: any) => p?.text || "").join("")
          : "";
      let parsed: any = {};
      try { parsed = JSON.parse(bruto); } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "A IA retornou uma resposta inválida. Tente novamente." });
      }
      const analises = Array.isArray(parsed.eixos) ? parsed.eixos : [];

      const respostasPorChave = new Map(
        respostas.map((r: any) => [String(r.chave), {
          chave: String(r.chave),
          titulo: String(r.pergunta),
          resposta: String(r.resposta),
        }]),
      );
      const eixoPorId = new Map(eixos.map((e: any) => [String(e.eixoId), e]));

      let divergencias = 0;
      let coerentes = 0;
      let ignorados = 0;
      let justificativasAtualizadas = 0;
      let descricoesAtualizadas = 0;

      for (const analise of analises) {
        const eixo = eixoPorId.get(String(analise.eixoId));
        if (!eixo) { ignorados++; continue; }

        const sugerida = String(analise.relacaoSugerida || "");
        if (!["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"].includes(sugerida)) { ignorados++; continue; }

        const evidencias = Array.isArray(analise.evidencias)
          ? analise.evidencias
              .map((chave: any) => respostasPorChave.get(String(chave)))
              .filter(Boolean)
          : [];
        const justificativa = String(analise.justificativa || "").trim();
        const descricaoEixo = String(analise.descricaoEixo || "").trim();
        const conhecimentosEixo = Array.isArray(analise.conhecimentosEixo)
          ? analise.conhecimentosEixo.map((item: any) => String(item || "").trim()).filter((item: string) => item.length >= 2).slice(0, 10)
          : [];
        if (justificativa.length < 40 || evidencias.length === 0) { ignorados++; continue; }

        const descricaoAtual = String(eixo.descricao || "").trim();
        const catalogoAindaGenerico =
          !descricaoAtual ||
          descricaoAtual.includes('definido a partir das questões técnicas vinculadas') ||
          eixo.conhecimentos.some((item: string) => item.length > 180);

        if (catalogoAindaGenerico && descricaoEixo.length >= 40 && conhecimentosEixo.length >= 3) {
          await db.execute(sql`
            UPDATE prova_utic_eixo_catalogo
               SET descricao = ${descricaoEixo},
                   conhecimentos_json = ${JSON.stringify(conhecimentosEixo)},
                   atualizado_por = ${ctx.user.id},
                   updated_at = NOW()
             WHERE eixo_id = ${eixo.eixoId}
          `);
          descricoesAtualizadas++;
        }

        if (sugerida === String(eixo.relacaoAtual || "")) {
          if (justificativa !== String(eixo.justificativaAtual || "").trim()) {
            await gravarEixo(db, {
              matrizId: Number(matriz.matrizId),
              eixoId: String(eixo.eixoId),
              eixo: String(eixo.eixo),
              relacao: sugerida as "ESSENCIAL" | "TRANSVERSAL" | "NAO_ESSENCIAL",
              statusClassificacao: "CLASSIFICADO",
              justificativa,
              anterior:
                eixo.percentualAnterior === null || eixo.percentualAnterior === undefined
                  ? null
                  : Number(eixo.percentualAnterior),
              motivo: "Justificativa fundamentada no Questionário de Atividades/Função",
              observacao:
                "A análise confirmou a classificação atual e atualizou somente a justificativa com base nas respostas do questionário.",
            }, Number(ctx.user.id));
            justificativasAtualizadas++;
          }
          coerentes++;
          continue;
        }

        await db.execute(sql`
          INSERT INTO prova_utic_eixo_revisoes_questionario
            (matriz_id, colaborador_id, questionario_id, eixo_id, eixo_nome,
             relacao_atual, relacao_sugerida, justificativa_sugerida, evidencias_json, status)
          VALUES
            (${matriz.matrizId}, ${input.colaboradorId}, ${questionario.id},
             ${eixo.eixoId}, ${eixo.eixo}, ${eixo.relacaoAtual ?? null}, ${sugerida},
             ${justificativa}, ${JSON.stringify(evidencias)}, 'PENDENTE')
          ON DUPLICATE KEY UPDATE
            questionario_id = VALUES(questionario_id),
            eixo_nome = VALUES(eixo_nome),
            relacao_atual = VALUES(relacao_atual),
            relacao_sugerida = VALUES(relacao_sugerida),
            justificativa_sugerida = VALUES(justificativa_sugerida),
            evidencias_json = VALUES(evidencias_json),
            status = 'PENDENTE',
            relacao_final = NULL,
            decidido_por = NULL,
            decidido_em = NULL,
            updated_at = NOW()
        `);
        divergencias++;
      }

      return {
        modo: "ANALISE_OPENAI" as const,
        colaboradorId: Number(matriz.colaboradorId),
        colaboradorNome: String(matriz.colaboradorNome),
        questionarioId: Number(questionario.id),
        eixosAnalisados: analises.length,
        coerentes,
        divergencias,
        ignorados,
        justificativasAtualizadas,
        descricoesAtualizadas,
      };
    }),

  listarRevisoesQuestionario: adminProcedure
    .input(z.object({ status: z.enum(["PENDENTE", "AJUSTADA", "MANTIDA"]).optional() }).optional())
    .query(async ({ input }) => {
      const db = await ensureTechnicalMatrixTables();
      const result = await db.execute(sql`
        SELECT r.id, r.matriz_id AS matrizId, r.colaborador_id AS colaboradorId,
               u.name AS colaboradorNome, d.nome AS unidadeNome,
               r.questionario_id AS questionarioId,
               r.eixo_id AS eixoId, r.eixo_nome AS eixo,
               r.relacao_atual AS relacaoAtual, r.relacao_sugerida AS relacaoSugerida,
               r.justificativa_sugerida AS justificativaSugerida,
               r.evidencias_json AS evidenciasJson,
               r.status, r.relacao_final AS relacaoFinal,
               r.decidido_em AS decididoEm, decisor.name AS decididoPorNome,
               r.created_at AS createdAt,
               c.descricao AS eixoDescricao,
               c.conhecimentos_json AS conhecimentosJson
          FROM prova_utic_eixo_revisoes_questionario r
          JOIN users u ON u.id = r.colaborador_id
          LEFT JOIN departamentos d ON d.id = u.departamentoId
          LEFT JOIN users decisor ON decisor.id = r.decidido_por
          LEFT JOIN prova_utic_eixo_catalogo c ON c.eixo_id = r.eixo_id
         WHERE (${input?.status ?? null} IS NULL OR r.status = ${input?.status ?? null})
         ORDER BY COALESCE(d.nome, ''), u.name, r.eixo_nome
      `);

      return rowsOf<any>(result).map((item) => {
        const parseJson = (valor: unknown) => {
          if (!valor) return null;
          try { return JSON.parse(String(valor)); } catch { return null; }
        };
        return {
          ...item,
          evidencias: parseJson(item.evidenciasJson) ?? [],
          conhecimentos: parseJson(item.conhecimentosJson) ?? [],
        };
      });
    }),

  registrarRevisoesQuestionario: adminProcedure
    .input(z.object({
      revisoes: z.array(z.object({
        matrizId: z.number().int().positive(),
        colaboradorId: z.number().int().positive(),
        questionarioId: z.number().int().positive().nullable().optional(),
        eixoId: z.string().min(1).max(40),
        eixo: z.string().min(1).max(255),
        relacaoAtual: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"]).nullable(),
        relacaoSugerida: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"]),
        justificativaSugerida: z.string().trim().min(20).max(10000),
        evidencias: z.array(z.object({
          chave: z.string().max(100),
          titulo: z.string().max(255),
          resposta: z.string().max(10000),
        })).optional(),
      })).min(1).max(500),
    }))
    .mutation(async ({ input }) => {
      const db = await ensureTechnicalMatrixTables();
      let registradas = 0;

      for (const item of input.revisoes) {
        if (item.relacaoAtual === item.relacaoSugerida) continue;

        await db.execute(sql`
          INSERT INTO prova_utic_eixo_revisoes_questionario
            (matriz_id, colaborador_id, questionario_id, eixo_id, eixo_nome,
             relacao_atual, relacao_sugerida, justificativa_sugerida, evidencias_json, status)
          VALUES
            (${item.matrizId}, ${item.colaboradorId}, ${item.questionarioId ?? null},
             ${item.eixoId}, ${item.eixo}, ${item.relacaoAtual}, ${item.relacaoSugerida},
             ${item.justificativaSugerida}, ${JSON.stringify(item.evidencias ?? [])}, 'PENDENTE')
          ON DUPLICATE KEY UPDATE
            questionario_id = VALUES(questionario_id),
            eixo_nome = VALUES(eixo_nome),
            relacao_atual = VALUES(relacao_atual),
            relacao_sugerida = VALUES(relacao_sugerida),
            justificativa_sugerida = VALUES(justificativa_sugerida),
            evidencias_json = VALUES(evidencias_json),
            status = IF(status = 'PENDENTE', 'PENDENTE', status),
            updated_at = NOW()
        `);
        registradas++;
      }

      return { registradas };
    }),

  decidirRevisaoQuestionario: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      decisao: z.enum(["AJUSTADA", "MANTIDA"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTechnicalMatrixTables();
      const revisaoResult = await db.execute(sql`
        SELECT r.*, e.eixo_nome AS eixoAtualNome, e.relacao AS eixoRelacaoAtual,
               e.justificativa AS eixoJustificativaAtual, e.percentual_anterior AS anterior
          FROM prova_utic_eixo_revisoes_questionario r
          JOIN prova_utic_matriz_eixos e
            ON e.matriz_id = r.matriz_id AND e.eixo_id = r.eixo_id
         WHERE r.id = ${input.id}
         LIMIT 1
      `);
      const revisao = rowsOf<any>(revisaoResult)[0];
      if (!revisao) throw new TRPCError({ code: "NOT_FOUND", message: "Revisão sugerida não encontrada." });
      if (revisao.status !== "PENDENTE") {
        throw new TRPCError({ code: "CONFLICT", message: "Esta revisão já foi analisada." });
      }

      let relacaoFinal = revisao.eixoRelacaoAtual ?? null;
      if (input.decisao === "AJUSTADA") {
        relacaoFinal = revisao.relacao_sugerida;
        await gravarEixo(db, {
          matrizId: Number(revisao.matriz_id),
          eixoId: String(revisao.eixo_id),
          eixo: String(revisao.eixoAtualNome || revisao.eixo_nome),
          relacao: revisao.relacao_sugerida,
          statusClassificacao: "CLASSIFICADO",
          justificativa: String(revisao.justificativa_sugerida),
          anterior: revisao.anterior === null || revisao.anterior === undefined ? null : Number(revisao.anterior),
          motivo: "Revisão fundamentada no Questionário de Atividades/Função",
          observacao: "Classificação ajustada após análise administrativa de sugestão fundamentada no questionário.",
        }, ctx.user.id);
      }

      await db.execute(sql`
        UPDATE prova_utic_eixo_revisoes_questionario
           SET status = ${input.decisao},
               relacao_final = ${relacaoFinal},
               decidido_por = ${ctx.user.id},
               decidido_em = NOW(),
               updated_at = NOW()
         WHERE id = ${input.id}
      `);

      return { decisao: input.decisao, relacaoFinal };
    }),

  listarCatalogoEixos: adminProcedure.query(async () => {
    const db = await ensureTechnicalMatrixTables();
    const result = await db.execute(sql`
      SELECT eixo_id AS eixoId, eixo_nome AS eixo, descricao,
             conhecimentos_json AS conhecimentosJson, fonte, updated_at AS updatedAt
        FROM prova_utic_eixo_catalogo
       ORDER BY eixo_nome
    `);
    return rowsOf<any>(result).map((item) => {
      let conhecimentos: string[] = [];
      try { conhecimentos = JSON.parse(String(item.conhecimentosJson || "[]")); } catch {}
      return { ...item, conhecimentos };
    });
  }),

  salvarCatalogoEixos: adminProcedure
    .input(z.object({
      itens: z.array(z.object({
        eixoId: z.string().min(1).max(40),
        eixo: z.string().min(1).max(255),
        descricao: z.string().trim().min(20).max(10000),
        conhecimentos: z.array(z.string().trim().min(2).max(500)).min(1).max(100),
        fonte: z.string().max(5000).nullable().optional(),
      })).min(1).max(500),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTechnicalMatrixTables();
      for (const item of input.itens) {
        await db.execute(sql`
          INSERT INTO prova_utic_eixo_catalogo
            (eixo_id, eixo_nome, descricao, conhecimentos_json, fonte, atualizado_por)
          VALUES
            (${item.eixoId}, ${item.eixo}, ${item.descricao},
             ${JSON.stringify(item.conhecimentos)}, ${item.fonte ?? null}, ${ctx.user.id})
          ON DUPLICATE KEY UPDATE
            eixo_nome = VALUES(eixo_nome),
            descricao = VALUES(descricao),
            conhecimentos_json = VALUES(conhecimentos_json),
            fonte = VALUES(fonte),
            atualizado_por = VALUES(atualizado_por),
            updated_at = NOW()
        `);
      }
      return { salvos: input.itens.length };
    }),

  responderSolicitacao: adminProcedure
    .input(z.object({
      id: z.number().int().positive(),
      decisao: z.enum(["AJUSTADA", "MANTIDA"]),
      relacaoFinal: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_ESSENCIAL"]).optional(),
      resposta: z.string().trim().min(5, "Informe a resposta ao empregado.").max(3000),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await ensureTechnicalMatrixTables();
      const [solicitacao] = (await listarSolicitacoesDb(db, {})).filter((item: any) => Number(item.id) === input.id);
      if (!solicitacao) throw new TRPCError({ code: "NOT_FOUND", message: "Solicitação não encontrada." });
      if (solicitacao.status !== "PENDENTE") {
        throw new TRPCError({ code: "CONFLICT", message: "Esta solicitação já foi respondida." });
      }

      const eixoResult = await db.execute(sql`
        SELECT eixo_nome AS eixo, relacao, justificativa, percentual_anterior AS anterior
          FROM prova_utic_matriz_eixos
         WHERE matriz_id = ${solicitacao.matrizId} AND eixo_id = ${solicitacao.eixoId}
         LIMIT 1
      `);
      const eixoAtual = rowsOf<any>(eixoResult)[0];
      if (!eixoAtual) throw new TRPCError({ code: "NOT_FOUND", message: "Eixo não encontrado na matriz do empregado." });

      let relacaoFinal: string | null = eixoAtual.relacao ?? null;
      if (input.decisao === "AJUSTADA") {
        const novaRelacao = input.relacaoFinal ?? solicitacao.relacaoSolicitada;
        relacaoFinal = novaRelacao;
        await gravarEixo(db, {
          matrizId: Number(solicitacao.matrizId),
          eixoId: solicitacao.eixoId,
          eixo: eixoAtual.eixo,
          relacao: novaRelacao,
          statusClassificacao: "CLASSIFICADO",
          justificativa: input.resposta,
          anterior: eixoAtual.anterior === null || eixoAtual.anterior === undefined ? null : Number(eixoAtual.anterior),
          motivo: "Reclassificação solicitada pelo empregado",
          observacao: `Solicitação #${input.id}: ${solicitacao.justificativa}`.slice(0, 1000),
        }, ctx.user.id);
      }

      await db.execute(sql`
        UPDATE prova_utic_eixo_solicitacoes
           SET status = ${input.decisao},
               relacao_final = ${relacaoFinal},
               resposta_admin = ${input.resposta},
               respondido_por = ${ctx.user.id},
               respondido_em = NOW()
         WHERE id = ${input.id}
      `);

      try {
        await notificarEmpregadoResposta({
          colaboradorId: Number(solicitacao.colaboradorId),
          colaboradorNome: solicitacao.colaboradorNome,
          colaboradorEmail: solicitacao.colaboradorEmail ?? null,
          eixo: solicitacao.eixo,
          decisao: input.decisao,
          relacaoFinal,
          resposta: input.resposta,
          solicitacaoId: input.id,
        });
      } catch (error) {
        console.warn("[Eixos] Falha ao notificar empregado", error);
      }
      return { decisao: input.decisao, relacaoFinal };
    }),
});
