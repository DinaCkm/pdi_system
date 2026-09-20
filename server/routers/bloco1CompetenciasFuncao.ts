import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { ensureTechnicalMatrixTables } from "../services/technicalMatrixSchema";
import { avaliacoes, medicoesCompetencias } from "../../drizzle/avaliacoes-schema";
import { ciclos, competenciasMacros, departamentos, users } from "../../drizzle/schema";
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
      const db = await ensureTechnicalMatrixTables();

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

      const matrizResult = await db.execute(
        sql.raw(
          "SELECT m.id AS matrizId, m.status AS matrizStatus, m.fonte AS matrizFonte, " +
          "e.id AS eixoRegistroId, e.eixo_id AS eixoId, e.eixo_nome AS eixoNome, " +
          "e.relacao, e.status_classificacao AS statusClassificacao, e.justificativa, " +
          "e.percentual_anterior AS percentualAnterior " +
          "FROM prova_utic_matrizes m " +
          "LEFT JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id " +
          "WHERE m.colaborador_id = " + Number(input.colaboradorId) + " " +
          "ORDER BY e.id",
        ),
      );

      const linhasTecnicas = rowsOf<any>(matrizResult);
      const matrizBase = linhasTecnicas[0] ?? null;
      const resultadoTecnicoResult = await db.execute(sql`
        SELECT rp.resultado_json AS resultadoJson, rp.percentual_geral AS percentualGeral,
               rp.calculado_em AS calculadoEm, a.titulo AS aplicacaoTitulo
          FROM resultados_proficiencia rp
          JOIN aplicacoes_proficiencia a ON a.id = rp.aplicacao_id
         WHERE rp.colaborador_id = ${input.colaboradorId}
         ORDER BY rp.calculado_em DESC, rp.id DESC
         LIMIT 1
      `);
      const resultadoTecnicoLinha = rowsOf<any>(resultadoTecnicoResult)[0] ?? null;
      const resultadoTecnico = resultadoTecnicoLinha
        ? parseResultadoProficiencia(resultadoTecnicoLinha.resultadoJson)
        : { porEixo: [] };

      const tecnicoAtualPorNome = new Map<string, any>();
      for (const eixo of resultadoTecnico.porEixo ?? []) {
        tecnicoAtualPorNome.set(normalizarNome(eixo.eixo), eixo);
      }

      const tecnicas = linhasTecnicas
        .filter((linha) => linha.eixoRegistroId)
        .map((linha) => {
          const atual = tecnicoAtualPorNome.get(normalizarNome(linha.eixoNome));
          const percentualAnterior =
            linha.percentualAnterior === null ? null : Number(linha.percentualAnterior);
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
            eixoId: String(linha.eixoId),
            eixoNome: String(linha.eixoNome),
            classificacao: linha.relacao ? String(linha.relacao) : null,
            statusClassificacao: String(linha.statusClassificacao || "PENDENTE"),
            justificativa: linha.justificativa ? String(linha.justificativa) : null,
            percentualAnterior,
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
            criarNovaAcaoPdi: evolucaoPp !== null && evolucaoPp <= 0,
            acertos: atual?.acertos ?? null,
            totalQuestoes: atual?.totalQuestoes ?? null,
            fonte:
              matrizBase?.matrizFonte ||
              "Questionário individual de levantamento das atividades",
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
          matrizId: matrizBase?.matrizId ? Number(matrizBase.matrizId) : null,
          status: matrizBase?.matrizStatus ?? null,
          fonte:
            matrizBase?.matrizFonte ||
            "Questionário individual de levantamento das atividades",
          aplicacaoAtual: resultadoTecnicoLinha?.aplicacaoTitulo ?? null,
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
