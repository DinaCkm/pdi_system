import { TRPCError } from "@trpc/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
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

      const matrizResult = await db.execute(
        sql.raw(
          "SELECT m.id AS matrizId, m.status AS matrizStatus, m.fonte AS matrizFonte, " +
          "e.id AS eixoRegistroId, e.eixo_id AS eixoId, e.eixo_nome AS eixoNome, " +
          "e.relacao, e.percentual_anterior AS percentualAnterior " +
          "FROM prova_utic_matrizes m " +
          "LEFT JOIN prova_utic_matriz_eixos e ON e.matriz_id = m.id " +
          "WHERE m.colaborador_id = " + Number(input.colaboradorId) + " " +
          "ORDER BY e.id",
        ),
      );

      const linhasTecnicas = rowsOf<any>(matrizResult);
      const matrizBase = linhasTecnicas[0] ?? null;
      const tecnicas = linhasTecnicas
        .filter((linha) => linha.eixoRegistroId)
        .map((linha) => ({
          eixoRegistroId: Number(linha.eixoRegistroId),
          eixoId: String(linha.eixoId),
          eixoNome: String(linha.eixoNome),
          classificacao: String(linha.relacao),
          percentualAnterior:
            linha.percentualAnterior === null ? null : Number(linha.percentualAnterior),
          fonte:
            matrizBase?.matrizFonte ||
            "Questionário individual de levantamento das atividades",
        }));

      const comportamentais = await db
        .select({
          medicaoId: medicoesCompetencias.id,
          avaliacaoId: avaliacoes.id,
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
          item.cicloNome,
          item.cicloDataInicio,
          item.cicloDataFim,
          item.dataReferencia,
        ]
          .filter(Boolean)
          .map((valor) => String(valor));

        for (const candidato of candidatos) {
          const encontrado = candidato.match(/\\b(2024|2025)\\b/);
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
