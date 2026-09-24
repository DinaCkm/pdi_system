import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/customTrpc";
import { getDb, getSubordinates } from "../db";
import { ensureHomologacaoTables } from "../services/homologacaoProvas";
import { ensureTechnicalMatrixTables } from "../services/technicalMatrixSchema";
import { avaliacoes, medicoesCompetencias } from "../../drizzle/avaliacoes-schema";
import {
  ciclos,
  competenciasMacros,
  departamentos,
  questionarioAtividadesEixosTecnicos,
  questionariosAtividadesFuncao,
  registroHistoricoProficienciaEixos,
  users,
} from "../../drizzle/schema";
import {
  funcoesOrganizacionais,
  usuariosFuncoesOrganizacionais,
} from "../../drizzle/comportamental-schema";

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function normalizarNome(valor: unknown) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseResultadoProficiencia(valor: unknown) {
  try {
    return JSON.parse(String(valor ?? "{}"));
  } catch {
    return { porEixo: [], percentualGeral: 0 };
  }
}

async function dbObrigatorio() {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Banco de dados indisponível.",
    });
  }
  await ensureHomologacaoTables(db);
  await ensureTechnicalMatrixTables();
  return db;
}

export const bloco1CompetenciasFuncaoRouter = router({
  empregados: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbObrigatorio();

    const lista = await db
      .select({
        id: users.id,
        nome: users.name,
        cargo: users.cargo,
        departamentoId: users.departamentoId,
        departamentoNome: departamentos.nome,
        funcaoOrganizacionalId: usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
        funcaoNome: funcoesOrganizacionais.nome,
        status: users.status,
      })
      .from(users)
      .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
      .leftJoin(
        usuariosFuncoesOrganizacionais,
        and(
          eq(usuariosFuncoesOrganizacionais.usuarioId, users.id),
          eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
          eq(usuariosFuncoesOrganizacionais.ativo, true),
        ),
      )
      .leftJoin(
        funcoesOrganizacionais,
        eq(
          usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
          funcoesOrganizacionais.id,
        ),
      )
      .orderBy(users.name);

    if (ctx.user.role === "admin" || ctx.user.role === "Administrador" || ctx.user.role === "gerente") {
      return lista;
    }

    if (ctx.user.role === "colaborador") {
      return lista.filter((item: any) => Number(item.id) === Number(ctx.user.id));
    }

    if (ctx.user.role === "lider") {
      const subordinados = await getSubordinates(Number(ctx.user.id));
      const permitidos = new Set<number>([
        Number(ctx.user.id),
        ...subordinados.map((item: any) => Number(item.id)),
      ]);
      return lista.filter((item: any) => permitidos.has(Number(item.id)));
    }

    return [];
  }),

  mapaIndividual: protectedProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await dbObrigatorio();

      const empregado = (
        await db
          .select({
            id: users.id,
            nome: users.name,
            cargo: users.cargo,
            departamentoNome: departamentos.nome,
            funcaoOrganizacionalId: usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
            funcaoNome: funcoesOrganizacionais.nome,
          })
          .from(users)
          .leftJoin(departamentos, eq(users.departamentoId, departamentos.id))
          .leftJoin(
            usuariosFuncoesOrganizacionais,
            and(
              eq(usuariosFuncoesOrganizacionais.usuarioId, users.id),
              eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
              eq(usuariosFuncoesOrganizacionais.ativo, true),
            ),
          )
          .leftJoin(
            funcoesOrganizacionais,
            eq(
              usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
              funcoesOrganizacionais.id,
            ),
          )
          .where(eq(users.id, input.colaboradorId))
          .limit(1)
      )[0];

      if (!empregado) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empregado não encontrado.",
        });
      }

      const role = String(ctx.user.role);
      if (role === "colaborador" && Number(input.colaboradorId) !== Number(ctx.user.id)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode visualizar a sua própria evolução." });
      }
      if (role === "lider" && Number(input.colaboradorId) !== Number(ctx.user.id)) {
        const subordinados = await getSubordinates(Number(ctx.user.id));
        const permitido = subordinados.some((item: any) => Number(item.id) === Number(input.colaboradorId));
        if (!permitido) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Este empregado não pertence à sua equipe." });
        }
      }
      if (!["admin", "Administrador", "gerente", "lider", "colaborador"].includes(role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Perfil sem acesso à Evolução Individual." });
      }

      let eixosQuestionario: any[] = [];
      try {
        eixosQuestionario = await db
          .select({
            eixoRegistroId: questionarioAtividadesEixosTecnicos.id,
            questionarioId: questionariosAtividadesFuncao.id,
            anoQuestionario: questionariosAtividadesFuncao.ano,
            versaoQuestionario: questionariosAtividadesFuncao.versao,
            statusQuestionario: questionariosAtividadesFuncao.status,
            fonteQuestionario: questionariosAtividadesFuncao.fonte,
            provaId: questionarioAtividadesEixosTecnicos.provaId,
            origemProvaChave: questionarioAtividadesEixosTecnicos.origemProvaChave,
            eixoChave: questionarioAtividadesEixosTecnicos.eixoChave,
            eixoNome: questionarioAtividadesEixosTecnicos.eixoNome,
            classificacao: questionarioAtividadesEixosTecnicos.classificacao,
            statusClassificacao: questionarioAtividadesEixosTecnicos.statusClassificacao,
            justificativa: questionarioAtividadesEixosTecnicos.justificativa,
          })
          .from(questionarioAtividadesEixosTecnicos)
          .innerJoin(
            questionariosAtividadesFuncao,
            eq(questionarioAtividadesEixosTecnicos.questionarioId, questionariosAtividadesFuncao.id),
          )
          .where(
            and(
              eq(questionariosAtividadesFuncao.colaboradorId, input.colaboradorId),
              eq(questionarioAtividadesEixosTecnicos.origemProva, "PROVA_HISTORICA"),
            ),
          )
          .orderBy(
            desc(questionariosAtividadesFuncao.ano),
            desc(questionariosAtividadesFuncao.versao),
            desc(questionariosAtividadesFuncao.id),
            desc(questionarioAtividadesEixosTecnicos.id),
          );
      } catch (error) {
        console.warn("[EVOLUCAO_INDIVIDUAL] Histórico regional indisponível; usando matriz individual.", error);
        eixosQuestionario = [];
      }

      const eixoReferencia = eixosQuestionario[0] ?? null;
      const questionarioId = eixoReferencia?.questionarioId ?? null;
      const anoQuestionario = eixoReferencia?.anoQuestionario ?? null;
      const origemProvaChave = eixoReferencia?.origemProvaChave ?? null;
      const provaHistoricaId = eixoReferencia?.provaId ?? null;

      const linhasRegionais =
        questionarioId && origemProvaChave
          ? eixosQuestionario
              .filter(
                (item) =>
                  Number(item.questionarioId) === Number(questionarioId) &&
                  item.origemProvaChave === origemProvaChave,
              )
              .sort((a, b) => Number(a.eixoRegistroId) - Number(b.eixoRegistroId))
          : [];

      const matrizAdministrativaResult = linhasRegionais.length === 0
        ? await db.execute(sql`
            SELECT e.id AS eixoRegistroId,
                   e.eixo_id AS eixoChave,
                   e.eixo_nome AS eixoNome,
                   e.relacao AS classificacao,
                   e.status_classificacao AS statusClassificacao,
                   e.justificativa,
                   e.percentual_anterior AS percentualAnteriorMatriz
              FROM prova_utic_matrizes m
              JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
             WHERE m.colaborador_id = ${input.colaboradorId}
             ORDER BY e.id
          `)
        : null;
      const linhasAdministrativas = matrizAdministrativaResult ? rowsOf<any>(matrizAdministrativaResult) : [];
      const linhasTecnicas: any[] = linhasRegionais.length > 0 ? linhasRegionais : linhasAdministrativas;
      const fonteTecnica = linhasRegionais.length > 0
        ? "Prova histórica regional"
        : linhasAdministrativas.length > 0
          ? "Matriz histórica individual"
          : "Sem histórico técnico localizado";

      const historicosRegistrados = provaHistoricaId
        ? await db
            .select()
            .from(registroHistoricoProficienciaEixos)
            .where(
              and(
                eq(registroHistoricoProficienciaEixos.colaboradorId, input.colaboradorId),
                eq(registroHistoricoProficienciaEixos.provaHistoricaId, Number(provaHistoricaId)),
              ),
            )
        : [];

      const historicoPorEixo = new Map(
        historicosRegistrados.map((item) => [item.eixoChave, item]),
      );

      // A próxima avaliação técnica só aparece depois de uma aplicação oficial calculada.
      // Testes administrativos são sempre excluídos.
      const anoBaseTecnica = anoQuestionario ? Number(anoQuestionario) : 2025;
      const resultadosPosterioresResult = await db.execute(sql`
            SELECT rp.resultado_json AS resultadoJson,
                   rp.calculado_em AS calculadoEm,
                   a.id AS aplicacaoId,
                   a.titulo AS aplicacaoTitulo,
                   p.id AS provaId,
                   p.codigo AS provaCodigo,
                   p.nome AS provaNome,
                   p.unidade AS provaUnidade,
                   p.ano AS provaAno
              FROM resultados_proficiencia rp
              JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
              LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
              JOIN provas_importadas p ON p.id = a.prova_id
             WHERE rp.colaborador_id = ${input.colaboradorId}
               AND ph.id IS NULL
               AND p.ano > ${anoBaseTecnica}
               AND p.codigo NOT LIKE '%HIST%'
             ORDER BY rp.calculado_em DESC, rp.id DESC
          `);

      const resultadosPosteriores = rowsOf<any>(resultadosPosterioresResult);

      const unidadeEmpregado = normalizarNome(empregado.departamentoNome);
      const resultadoTecnicoLinha =
        resultadosPosteriores.find((linha: any) => {
          const unidadeProva = normalizarNome(linha.provaUnidade);
          return Boolean(
            unidadeEmpregado &&
              unidadeProva &&
              (unidadeProva === unidadeEmpregado ||
                unidadeProva.includes(unidadeEmpregado) ||
                unidadeEmpregado.includes(unidadeProva)),
          );
        }) ?? null;

      const resultadoTecnico = resultadoTecnicoLinha
        ? parseResultadoProficiencia(resultadoTecnicoLinha.resultadoJson)
        : { porEixo: [] };

      const tecnicoAtualPorNome = new Map<string, any>();
      for (const eixo of resultadoTecnico.porEixo ?? []) {
        tecnicoAtualPorNome.set(normalizarNome(eixo.eixo), eixo);
      }

      const nomesHistoricos = new Set(linhasTecnicas.map((linha: any) => normalizarNome(linha.eixoNome)));
      const linhasTecnicasComNovos: any[] = [
        ...linhasTecnicas,
        ...(resultadoTecnico.porEixo ?? [])
          .filter((eixo: any) => !nomesHistoricos.has(normalizarNome(eixo.eixo)))
          .map((eixo: any, indice: number) => ({
            eixoRegistroId: -(indice + 1),
            eixoChave: `NOVO:${normalizarNome(eixo.eixo)}`,
            eixoNome: String(eixo.eixo ?? "Nova competência"),
            classificacao: eixo.relacao ?? null,
            statusClassificacao: eixo.relacao ? "CLASSIFICADO" : "PENDENTE",
            justificativa: null,
            percentualAnteriorMatriz: null,
            novoNaAvaliacao: true,
          })),
      ];

      const tecnicas = linhasTecnicasComNovos.map((linha: any) => {
        const historico = historicoPorEixo.get(String(linha.eixoChave));
        const atual = tecnicoAtualPorNome.get(normalizarNome(linha.eixoNome));
        const valorHistorico = historico?.percentualOriginal ?? linha.percentualAnteriorMatriz;
        const percentualAnterior =
          valorHistorico === null || valorHistorico === undefined
            ? null
            : Number(valorHistorico);
        const percentualAtual =
          atual?.percentualAtual === null || atual?.percentualAtual === undefined
            ? null
            : Number(atual.percentualAtual);
        const evolucaoPp =
          percentualAnterior === null || percentualAtual === null
            ? null
            : Math.round((percentualAtual - percentualAnterior) * 10) / 10;

        return {
          eixoRegistroId: Number(linha.eixoRegistroId),
          eixoId: String(linha.eixoChave),
          eixoChave: String(linha.eixoChave),
          eixoNome: String(linha.eixoNome),
          classificacao: linha.classificacao ? String(linha.classificacao) : null,
          statusClassificacao: String(linha.statusClassificacao || "PENDENTE"),
          justificativa: linha.justificativa ? String(linha.justificativa) : null,
          percentualAnterior,
          indicadorOriginalStatus: historico?.status ?? (percentualAnterior !== null ? "HISTORICO_VALIDO" : "PENDENTE_VALIDACAO"),
          percentualAtual,
          evolucaoPp,
          comparavel: percentualAnterior !== null && percentualAtual !== null,
          evolucao:
            evolucaoPp === null
              ? "SEM_COMPARACAO"
              : evolucaoPp > 0
                ? "EVOLUCAO"
                : evolucaoPp < 0
                  ? "REDUCAO"
                  : "ESTABILIDADE",
          criarNovaAcaoPdi: true,
          acertos: atual?.acertos ?? null,
          totalQuestoes: atual?.totalQuestoes ?? null,
          fonte: fonteTecnica,
          statusAtual: resultadoTecnicoLinha ? "PROVA_2_CALCULADA" : "AGUARDANDO_PROVA_2",
          editavelClassificacao: linhasRegionais.length > 0 && !linha.novoNaAvaliacao,
          novaCompetencia: Boolean(linha.novoNaAvaliacao),
        };
      });

      let comportamentais: any[] = [];
      let erroComportamental: string | null = null;
      try {
        const comportamentaisResult = await db.execute(sql`
          SELECT mc.id AS medicaoId,
                 a.id AS avaliacaoId,
                 a.titulo AS avaliacaoTitulo,
                 a.status AS avaliacaoStatus,
                 a.data_referencia AS dataReferencia,
                 a.cicloId AS cicloId,
                 c.nome AS cicloNome,
                 c.dataInicio AS cicloDataInicio,
                 c.dataFim AS cicloDataFim,
                 mc.competenciaMacroId AS competenciaMacroId,
                 cm.nome AS competenciaNome,
                 mc.valor AS valor,
                 mc.escala_min AS escalaMin,
                 mc.escala_max AS escalaMax,
                 mc.classificacao AS classificacao,
                 mc.validada AS validada
            FROM medicoes_competencias mc
            JOIN avaliacoes a ON a.id = mc.avaliacaoId
            LEFT JOIN ciclos c ON c.id = a.cicloId
            LEFT JOIN competencias_macros cm ON cm.id = mc.competenciaMacroId
           WHERE mc.colaboradorId = ${input.colaboradorId}
             AND mc.tipoCompetencia = 'COMPORTAMENTAL'
             AND mc.fonte = 'AVALIACAO_DESEMPENHO'
           ORDER BY a.data_referencia DESC, mc.id DESC
        `);
        comportamentais = rowsOf<any>(comportamentaisResult);
      } catch (error: any) {
        console.error("[EVOLUCAO_INDIVIDUAL] Falha ao carregar Avaliação de Desempenho.", error);
        erroComportamental = error?.message || "Não foi possível carregar as competências comportamentais.";
        comportamentais = [];
      }

      function periodoMedicao(item: any): { ano: number; rotulo: string; ordem: number } {
        const data = String(item.dataReferencia ?? "");
        const anoData = Number(data.slice(0, 4));
        const candidatos = [item.avaliacaoTitulo, item.cicloNome, item.cicloDataInicio, item.cicloDataFim]
          .filter(Boolean)
          .map((valor) => String(valor));
        let ano = Number.isFinite(anoData) && anoData > 2000 ? anoData : 0;
        if (!ano) {
          for (const candidato of candidatos) {
            const encontrado = candidato.match(/\b(20\d{2})\b/);
            if (encontrado) { ano = Number(encontrado[1]); break; }
          }
        }
        return {
          ano,
          rotulo: ano ? String(ano) : String(item.avaliacaoTitulo || item.cicloNome || "Avaliação"),
          ordem: ano ? ano * 10000 + Number(String(data).replace(/\D/g, "").slice(4, 8) || 0) : Number(item.medicaoId),
        };
      }

      const porCompetencia = new Map<number, any[]>();
      for (const item of comportamentais) {
        if (!item.validada && item.avaliacaoStatus !== "FINALIZADA") continue;
        const competenciaMacroId = Number(item.competenciaMacroId);
        if (!competenciaMacroId) continue;
        const lista = porCompetencia.get(competenciaMacroId) ?? [];
        lista.push({ ...item, periodo: periodoMedicao(item) });
        porCompetencia.set(competenciaMacroId, lista);
      }

      const evolucaoComportamental = Array.from(porCompetencia.entries())
        .map(([competenciaMacroId, medicoes]) => {
          const ordenadas = [...medicoes].sort((a, b) => b.periodo.ordem - a.periodo.ordem || Number(b.medicaoId) - Number(a.medicaoId));
          const atual = ordenadas[0] ?? null;
          const anterior = ordenadas.find((item) => item.avaliacaoId !== atual?.avaliacaoId) ?? null;
          const mesmaEscala = Boolean(
            anterior && atual &&
            Number(anterior.escalaMin) === Number(atual.escalaMin) &&
            Number(anterior.escalaMax) === Number(atual.escalaMax),
          );
          const resultadoAnterior = anterior ? Number(anterior.valor) : null;
          const resultadoAtual = atual ? Number(atual.valor) : null;
          const variacao = mesmaEscala && resultadoAnterior !== null && resultadoAtual !== null
            ? Math.round((resultadoAtual - resultadoAnterior) * 100) / 100
            : null;
          const evolucao = variacao === null
            ? "SEM_COMPARACAO"
            : variacao > 0
              ? "EVOLUCAO"
              : variacao < 0
                ? "REDUCAO"
                : "ESTABILIDADE";

          return {
            competenciaMacroId,
            competenciaNome: atual?.competenciaNome ?? anterior?.competenciaNome ?? "Competência",
            resultadoAnterior,
            resultadoAtual,
            periodoAnterior: anterior?.periodo.rotulo ?? null,
            periodoAtual: atual?.periodo.rotulo ?? null,
            resultado2024: anterior?.periodo.ano === 2024 ? resultadoAnterior : (atual?.periodo.ano === 2024 ? resultadoAtual : null),
            resultado2025: anterior?.periodo.ano === 2025 ? resultadoAnterior : (atual?.periodo.ano === 2025 ? resultadoAtual : null),
            escalaMinAnterior: anterior ? Number(anterior.escalaMin) : null,
            escalaMaxAnterior: anterior ? Number(anterior.escalaMax) : null,
            escalaMinAtual: atual ? Number(atual.escalaMin) : null,
            escalaMaxAtual: atual ? Number(atual.escalaMax) : null,
            classificacao: atual?.classificacao ?? anterior?.classificacao ?? null,
            comparavel: Boolean(anterior && atual && mesmaEscala),
            novaCompetencia: Boolean(atual && !anterior),
            variacao,
            evolucao,
            criarNovaAcaoPdi: true,
            motivo: !anterior
              ? "Existe apenas uma Avaliação de Desempenho válida para esta competência."
              : !mesmaEscala
                ? "As escalas das duas avaliações são diferentes."
                : null,
          };
        })
        .sort((a, b) => String(a.competenciaNome || "").localeCompare(String(b.competenciaNome || ""), "pt-BR"));

      return {
        empregado,
        tecnico: {
          matrizId: null,
          questionarioId: questionarioId ? Number(questionarioId) : null,
          anoQuestionario: anoQuestionario ? Number(anoQuestionario) : null,
          provaHistoricaId: provaHistoricaId ? Number(provaHistoricaId) : null,
          origemProvaChave,
          status: eixoReferencia?.statusQuestionario ?? null,
          fonte: fonteTecnica,
          aplicacaoAtual: resultadoTecnicoLinha?.aplicacaoTitulo ?? null,
          provaAtual: resultadoTecnicoLinha?.provaNome ?? null,
          calculadoEm: resultadoTecnicoLinha?.calculadoEm ?? null,
          competencias: tecnicas,
        },
        comportamental: {
          competencias: evolucaoComportamental,
          regraAtual:
            "Comparação entre as duas Avaliações de Desempenho válidas mais recentes da mesma competência e na mesma escala.",
          discNoCalculo: false,
          erroCarregamento: erroComportamental,
        },
      };
    }),

  painelGeral: adminProcedure.query(async () => {
    const db = await dbObrigatorio();

    const [usuariosResult, historicoRegionalResult, matrizResult, comportamentalResult, resultadosTecnicosResult] = await Promise.all([
      db.execute(sql`
        SELECT u.id, u.name AS nome, d.nome AS unidade
          FROM users u
          LEFT JOIN departamentos d ON d.id = u.departamentoId
         WHERE u.status = 'ativo'
      `),
      db.execute(sql`
        SELECT h.colaborador_id AS colaboradorId, h.eixo_chave AS eixoChave,
               h.eixo_nome AS eixoNome, h.percentual_original AS percentualAnterior
          FROM registro_historico_proficiencia_eixos h
      `),
      db.execute(sql`
        SELECT m.colaborador_id AS colaboradorId, e.eixo_id AS eixoChave,
               e.eixo_nome AS eixoNome, e.percentual_anterior AS percentualAnterior
          FROM prova_utic_matrizes m
          JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id
      `),
      db.execute(sql`
        SELECT mc.id AS medicaoId, mc.colaboradorId AS colaboradorId,
               mc.competenciaMacroId AS competenciaMacroId, cm.nome AS competenciaNome,
               mc.valor, mc.escala_min AS escalaMin, mc.escala_max AS escalaMax,
               mc.validada, a.id AS avaliacaoId, a.titulo AS avaliacaoTitulo,
               a.status AS avaliacaoStatus, a.data_referencia AS dataReferencia
          FROM medicoes_competencias mc
          JOIN avaliacoes a ON a.id = mc.avaliacaoId
          LEFT JOIN competencias_macros cm ON cm.id = mc.competenciaMacroId
         WHERE mc.tipoCompetencia = 'COMPORTAMENTAL'
           AND mc.fonte = 'AVALIACAO_DESEMPENHO'
         ORDER BY a.data_referencia DESC, mc.id DESC
      `),
      db.execute(sql`
        SELECT rp.colaborador_id AS colaboradorId, rp.resultado_json AS resultadoJson,
               rp.calculado_em AS calculadoEm, p.unidade AS provaUnidade, p.codigo AS provaCodigo
          FROM resultados_proficiencia rp
          JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
          LEFT JOIN provas_importadas_homologacao ph ON ph.aplicacao_teste_id = a.id
          JOIN provas_importadas p ON p.id = a.prova_id
         WHERE ph.id IS NULL
           AND p.ano > 2025
           AND p.codigo NOT LIKE '%HIST%'
         ORDER BY rp.calculado_em DESC, rp.id DESC
      `),
    ]);

    const usuarios = rowsOf<any>(usuariosResult);
    const usuarioPorId = new Map(usuarios.map((u) => [Number(u.id), u]));
    const regional = rowsOf<any>(historicoRegionalResult);
    const idsComRegional = new Set(regional.map((item) => Number(item.colaboradorId)));
    const tecnicosHistoricos = [
      ...regional,
      ...rowsOf<any>(matrizResult).filter((item) => !idsComRegional.has(Number(item.colaboradorId))),
    ];

    const ultimoResultadoPorUsuario = new Map<number, any>();
    for (const linha of rowsOf<any>(resultadosTecnicosResult)) {
      const colaboradorId = Number(linha.colaboradorId);
      if (ultimoResultadoPorUsuario.has(colaboradorId)) continue;
      const usuario = usuarioPorId.get(colaboradorId);
      if (!usuario) continue;
      const unidadeUsuario = normalizarNome(usuario.unidade);
      const unidadeProva = normalizarNome(linha.provaUnidade);
      if (unidadeUsuario && unidadeProva && (
        unidadeUsuario === unidadeProva ||
        unidadeUsuario.includes(unidadeProva) ||
        unidadeProva.includes(unidadeUsuario)
      )) {
        ultimoResultadoPorUsuario.set(colaboradorId, parseResultadoProficiencia(linha.resultadoJson));
      }
    }

    const compPorPessoa = new Map<string, any[]>();
    for (const item of rowsOf<any>(comportamentalResult)) {
      if (!item.validada && item.avaliacaoStatus !== "FINALIZADA") continue;
      const chave = `${Number(item.colaboradorId)}:${Number(item.competenciaMacroId)}`;
      const lista = compPorPessoa.get(chave) ?? [];
      lista.push(item);
      compPorPessoa.set(chave, lista);
    }

    const unidadesMap = new Map<string, any>();
    for (const usuario of usuarios) {
      const unidade = String(usuario.unidade || "Sem unidade");
      if (!unidadesMap.has(unidade)) {
        unidadesMap.set(unidade, {
          unidade,
          tipo: /\bREGIONAL\b/i.test(unidade) ? "REGIONAL" : "ADMINISTRATIVA",
          empregados: new Set<number>(),
          tecnicas: new Map<string, any>(),
          comportamentais: new Map<string, any>(),
        });
      }
      unidadesMap.get(unidade).empregados.add(Number(usuario.id));
    }

    for (const item of tecnicosHistoricos) {
      const usuario = usuarioPorId.get(Number(item.colaboradorId));
      if (!usuario) continue;
      const unidade = String(usuario.unidade || "Sem unidade");
      const grupo = unidadesMap.get(unidade);
      if (!grupo) continue;
      const chave = normalizarNome(item.eixoNome);
      if (!chave) continue;
      const reg = grupo.tecnicas.get(chave) ?? {
        eixo: String(item.eixoNome),
        anteriores: [],
        atuais: [],
        comparaveis: 0,
        evolucoes: [],
      };
      if (item.percentualAnterior !== null && item.percentualAnterior !== undefined) {
        reg.anteriores.push(Number(item.percentualAnterior));
      }
      const resultadoAtual = ultimoResultadoPorUsuario.get(Number(item.colaboradorId));
      const eixoAtual = (resultadoAtual?.porEixo ?? []).find((e: any) => normalizarNome(e.eixo) === chave);
      if (eixoAtual?.percentualAtual !== null && eixoAtual?.percentualAtual !== undefined) {
        const atual = Number(eixoAtual.percentualAtual);
        reg.atuais.push(atual);
        if (item.percentualAnterior !== null && item.percentualAnterior !== undefined) {
          reg.comparaveis += 1;
          reg.evolucoes.push(atual - Number(item.percentualAnterior));
        }
      }
      grupo.tecnicas.set(chave, reg);
    }

    for (const [chavePessoa, medicoes] of compPorPessoa.entries()) {
      const [colaboradorTexto] = chavePessoa.split(":");
      const colaboradorId = Number(colaboradorTexto);
      const usuario = usuarioPorId.get(colaboradorId);
      if (!usuario) continue;
      const unidade = String(usuario.unidade || "Sem unidade");
      const grupo = unidadesMap.get(unidade);
      if (!grupo) continue;

      const ordenadas = [...medicoes].sort((a, b) =>
        String(b.dataReferencia ?? "").localeCompare(String(a.dataReferencia ?? "")) ||
        Number(b.medicaoId) - Number(a.medicaoId)
      );
      const atual = ordenadas[0] ?? null;
      const anterior = ordenadas.find((item) => Number(item.avaliacaoId) !== Number(atual?.avaliacaoId)) ?? null;
      const nome = String(atual?.competenciaNome ?? anterior?.competenciaNome ?? "Competência");
      const chave = normalizarNome(nome);
      const reg = grupo.comportamentais.get(chave) ?? {
        competencia: nome,
        anteriores: [],
        atuais: [],
        variacoes: [],
        comparaveis: 0,
        periodoAnterior: null,
        periodoAtual: null,
      };
      if (anterior) {
        reg.anteriores.push(Number(anterior.valor));
        reg.periodoAnterior = String(anterior.dataReferencia ?? "").slice(0, 4) || reg.periodoAnterior;
      }
      if (atual) {
        reg.atuais.push(Number(atual.valor));
        reg.periodoAtual = String(atual.dataReferencia ?? "").slice(0, 4) || reg.periodoAtual;
      }
      if (
        anterior && atual &&
        Number(anterior.escalaMin) === Number(atual.escalaMin) &&
        Number(anterior.escalaMax) === Number(atual.escalaMax)
      ) {
        reg.comparaveis += 1;
        reg.variacoes.push(Number(atual.valor) - Number(anterior.valor));
      }
      grupo.comportamentais.set(chave, reg);
    }

    const media = (valores: number[]) =>
      valores.length ? Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 100) / 100 : null;

    return Array.from(unidadesMap.values())
      .map((grupo) => ({
        unidade: grupo.unidade,
        tipo: grupo.tipo,
        totalEmpregados: grupo.empregados.size,
        tecnicas: Array.from(grupo.tecnicas.values())
          .map((item: any) => ({
            eixo: item.eixo,
            mediaAnterior: media(item.anteriores),
            mediaAtual: media(item.atuais),
            evolucaoPp: media(item.evolucoes),
            comparaveis: item.comparaveis,
          }))
          .sort((a: any, b: any) => a.eixo.localeCompare(b.eixo, "pt-BR")),
        comportamentais: Array.from(grupo.comportamentais.values())
          .map((item: any) => ({
            competencia: item.competencia,
            mediaAnterior: media(item.anteriores),
            mediaAtual: media(item.atuais),
            variacao: media(item.variacoes),
            comparaveis: item.comparaveis,
            periodoAnterior: item.periodoAnterior,
            periodoAtual: item.periodoAtual,
          }))
          .sort((a: any, b: any) => a.competencia.localeCompare(b.competencia, "pt-BR")),
      }))
      .sort((a, b) => a.unidade.localeCompare(b.unidade, "pt-BR"));
  }),
});
