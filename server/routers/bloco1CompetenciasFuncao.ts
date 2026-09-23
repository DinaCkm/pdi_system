import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
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
  return db;
}

export const bloco1CompetenciasFuncaoRouter = router({
  empregados: adminProcedure.query(async () => {
    const db = await dbObrigatorio();

    return db
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
  }),

  mapaIndividual: adminProcedure
    .input(z.object({ colaboradorId: z.number().int().positive() }))
    .query(async ({ input }) => {
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

      const eixosQuestionario = await db
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

      const eixoReferencia = eixosQuestionario[0] ?? null;
      const questionarioId = eixoReferencia?.questionarioId ?? null;
      const anoQuestionario = eixoReferencia?.anoQuestionario ?? null;
      const origemProvaChave = eixoReferencia?.origemProvaChave ?? null;
      const provaHistoricaId = eixoReferencia?.provaId ?? null;

      const linhasTecnicas =
        questionarioId && origemProvaChave
          ? eixosQuestionario
              .filter(
                (item) =>
                  Number(item.questionarioId) === Number(questionarioId) &&
                  item.origemProvaChave === origemProvaChave,
              )
              .sort((a, b) => Number(a.eixoRegistroId) - Number(b.eixoRegistroId))
          : [];

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

      // Resultado atual: somente prova posterior ao marco histórico e nunca uma prova HIST.
      // Assim, avaliações antigas ou de outra unidade não viram "Prova 2" por engano.
      const resultadosPosterioresResult = anoQuestionario
        ? await db.execute(sql`
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
               AND p.ano > ${Number(anoQuestionario)}
               AND p.codigo NOT LIKE '%HIST%'
             ORDER BY rp.calculado_em DESC, rp.id DESC
          `)
        : null;

      const resultadosPosteriores = resultadosPosterioresResult
        ? rowsOf<any>(resultadosPosterioresResult)
        : [];

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

      const tecnicas = linhasTecnicas.map((linha) => {
        const historico = historicoPorEixo.get(linha.eixoChave);
        const atual = tecnicoAtualPorNome.get(normalizarNome(linha.eixoNome));
        const percentualAnterior =
          historico?.percentualOriginal === null || historico?.percentualOriginal === undefined
            ? null
            : Number(historico.percentualOriginal);
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
          indicadorOriginalStatus: historico?.status ?? "PENDENTE_VALIDACAO",
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
          fonte: "Questionário de Atividades/Função + prova histórica regional",
          statusAtual: resultadoTecnicoLinha ? "PROVA_2_CALCULADA" : "AGUARDANDO_PROVA_2",
        };
      });

      const comportamentais = await db
        .select({
          medicaoId: medicoesCompetencias.id,
          avaliacaoId: avaliacoes.id,
          avaliacaoTitulo: avaliacoes.titulo,
          dataReferencia: avaliacoes.dataReferencia,
          cicloId: avaliacoes.cicloId,
          cicloNome: ciclos.nome,
          cicloDataInicio: ciclos.dataInicio,
          cicloDataFim: ciclos.dataFim,
          competenciaMacroId: medicoesCompetencias.competenciaMacroId,
          competenciaNome: competenciasMacros.nome,
          valor: medicoesCompetencias.valor,
          escalaMin: medicoesCompetencias.escalaMin,
          escalaMax: medicoesCompetencias.escalaMax,
          validada: medicoesCompetencias.validada,
        })
        .from(medicoesCompetencias)
        .innerJoin(avaliacoes, eq(medicoesCompetencias.avaliacaoId, avaliacoes.id))
        .leftJoin(ciclos, eq(avaliacoes.cicloId, ciclos.id))
        .leftJoin(
          competenciasMacros,
          eq(medicoesCompetencias.competenciaMacroId, competenciasMacros.id),
        )
        .where(
          and(
            eq(medicoesCompetencias.colaboradorId, input.colaboradorId),
            eq(medicoesCompetencias.tipoCompetencia, "COMPORTAMENTAL"),
            eq(medicoesCompetencias.fonte, "AVALIACAO_DESEMPENHO"),
            eq(medicoesCompetencias.validada, true),
          ),
        )
        .orderBy(desc(avaliacoes.dataReferencia), desc(medicoesCompetencias.id));

      function anoDaMedicao(item: any): number | null {
        const candidatos = [
          item.avaliacaoTitulo,
          item.dataReferencia,
          item.cicloNome,
          item.cicloDataInicio,
          item.cicloDataFim,
        ]
          .filter(Boolean)
          .map((valor) => String(valor));

        for (const candidato of candidatos) {
          const encontrado = candidato.match(/\b(2024|2025)\b/);
          if (encontrado) return Number(encontrado[1]);
        }

        return null;
      }

      const porCompetencia = new Map<number, any>();

      for (const item of comportamentais) {
        const competenciaMacroId = Number(item.competenciaMacroId);
        if (!competenciaMacroId) continue;

        const ano = anoDaMedicao(item);
        if (ano !== 2024 && ano !== 2025) continue;

        const atual = porCompetencia.get(competenciaMacroId) ?? {
          competenciaMacroId,
          competenciaNome: item.competenciaNome,
          resultado2024: null,
          resultado2025: null,
          escalaMin2024: null,
          escalaMax2024: null,
          escalaMin2025: null,
          escalaMax2025: null,
        };

        const valor = Number(item.valor);
        const escalaMin = Number(item.escalaMin);
        const escalaMax = Number(item.escalaMax);

        if (ano === 2024 && atual.resultado2024 === null) {
          atual.resultado2024 = valor;
          atual.escalaMin2024 = escalaMin;
          atual.escalaMax2024 = escalaMax;
        }

        if (ano === 2025 && atual.resultado2025 === null) {
          atual.resultado2025 = valor;
          atual.escalaMin2025 = escalaMin;
          atual.escalaMax2025 = escalaMax;
        }

        porCompetencia.set(competenciaMacroId, atual);
      }

      const evolucaoComportamental = Array.from(porCompetencia.values())
        .map((item: any) => {
          const possuiDoisCiclos =
            item.resultado2024 !== null && item.resultado2025 !== null;
          const mesmaEscala =
            possuiDoisCiclos &&
            item.escalaMin2024 === item.escalaMin2025 &&
            item.escalaMax2024 === item.escalaMax2025;

          if (!possuiDoisCiclos || !mesmaEscala) {
            return {
              ...item,
              comparavel: false,
              variacao: null,
              evolucao: "SEM_COMPARACAO",
              criarNovaAcaoPdi: false,
              motivo: !possuiDoisCiclos
                ? "É necessário ter resultados válidos em 2024 e 2025."
                : "As escalas dos dois ciclos são diferentes.",
            };
          }

          const variacao =
            Math.round((item.resultado2025 - item.resultado2024) * 100) / 100;
          const evolucao =
            variacao > 0
              ? "EVOLUCAO"
              : variacao < 0
                ? "REDUCAO"
                : "ESTABILIDADE";

          return {
            ...item,
            comparavel: true,
            variacao,
            evolucao,
            criarNovaAcaoPdi: evolucao !== "EVOLUCAO",
            motivo: null,
          };
        })
        .sort((a: any, b: any) =>
          String(a.competenciaNome || "").localeCompare(
            String(b.competenciaNome || ""),
            "pt-BR",
          ),
        );

      return {
        empregado,
        tecnico: {
          matrizId: null,
          questionarioId: questionarioId ? Number(questionarioId) : null,
          anoQuestionario: anoQuestionario ? Number(anoQuestionario) : null,
          provaHistoricaId: provaHistoricaId ? Number(provaHistoricaId) : null,
          origemProvaChave,
          status: eixoReferencia?.statusQuestionario ?? null,
          fonte: "Questionário de Atividades/Função + prova histórica regional",
          aplicacaoAtual: resultadoTecnicoLinha?.aplicacaoTitulo ?? null,
          provaAtual: resultadoTecnicoLinha?.provaNome ?? null,
          calculadoEm: resultadoTecnicoLinha?.calculadoEm ?? null,
          competencias: tecnicas,
        },
        comportamental: {
          competencias: evolucaoComportamental,
          regraAtual:
            "Comparação exclusiva das competências comportamentais entre 2024 e 2025.",
          discNoCalculo: false,
        },
      };
    }),
});
