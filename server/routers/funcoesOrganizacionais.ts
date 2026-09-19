import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import { departamentos, users } from "../../drizzle/schema";
import {
  organizacoes,
  funcoesOrganizacionais,
  usuariosFuncoesOrganizacionais,
} from "../../drizzle/comportamental-schema";

const CARGOS_FUNCOES_INICIAIS = [
  "Analista Técnico I",
  "Analista Técnico III",
  "Gerente",
  "Assistente",
  "Administrador",
  "Assistente I",
  "Teste",
] as const;

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

export const funcoesOrganizacionaisRouter = router({
  organizacoes: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    return db
      .select({
        id: organizacoes.id,
        nome: organizacoes.nome,
        nomeFantasia: organizacoes.nomeFantasia,
        codigo: organizacoes.codigo,
        ativa: organizacoes.ativa,
      })
      .from(organizacoes)
      .orderBy(desc(organizacoes.ativa), asc(organizacoes.nome));
  }),

  criarOrganizacao: adminProcedure
    .input(
      z.object({
        nome: z.string().trim().min(2).max(255),
        nomeFantasia: z.string().trim().max(255).optional().nullable(),
        codigo: z.string().trim().min(2).max(100),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await dbObrigatorio();
      const existente = await db
        .select({ id: organizacoes.id })
        .from(organizacoes)
        .where(eq(organizacoes.codigo, input.codigo))
        .limit(1);

      if (existente.length) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Já existe uma organização com este código.",
        });
      }

      await db.insert(organizacoes).values({
        nome: input.nome,
        nomeFantasia: input.nomeFantasia ?? null,
        codigo: input.codigo,
        ativa: true,
      });

      return { success: true };
    }),

  listar: adminProcedure
    .input(
      z
        .object({
          organizacaoId: z.number().int().positive().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = await dbObrigatorio();
      const base = db
        .select({
          id: funcoesOrganizacionais.id,
          organizacaoId: funcoesOrganizacionais.organizacaoId,
          organizacaoNome: organizacoes.nome,
          departamentoId: funcoesOrganizacionais.departamentoId,
          departamentoNome: departamentos.nome,
          nome: funcoesOrganizacionais.nome,
          codigo: funcoesOrganizacionais.codigo,
          cargoReferencia: funcoesOrganizacionais.cargoReferencia,
          descricao: funcoesOrganizacionais.descricao,
          origem: funcoesOrganizacionais.origem,
          versao: funcoesOrganizacionais.versao,
          vigenciaInicio: funcoesOrganizacionais.vigenciaInicio,
          vigenciaFim: funcoesOrganizacionais.vigenciaFim,
          ativa: funcoesOrganizacionais.ativa,
        })
        .from(funcoesOrganizacionais)
        .innerJoin(
          organizacoes,
          eq(funcoesOrganizacionais.organizacaoId, organizacoes.id),
        )
        .leftJoin(
          departamentos,
          eq(funcoesOrganizacionais.departamentoId, departamentos.id),
        );

      if (input?.organizacaoId) {
        return base
          .where(eq(funcoesOrganizacionais.organizacaoId, input.organizacaoId))
          .orderBy(
            desc(funcoesOrganizacionais.ativa),
            asc(departamentos.nome),
            asc(funcoesOrganizacionais.nome),
          );
      }

      return base.orderBy(
        desc(funcoesOrganizacionais.ativa),
        asc(departamentos.nome),
        asc(funcoesOrganizacionais.nome),
      );
    }),

  criar: adminProcedure
    .input(
      z.object({
        organizacaoId: z.number().int().positive(),
        departamentoId: z.number().int().positive().optional().nullable(),
        nome: z.string().trim().min(2).max(255),
        codigo: z.string().trim().max(100).optional().nullable(),
        cargoReferencia: z.string().trim().max(255).optional().nullable(),
        descricao: z.string().trim().max(5000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();
      await db.insert(funcoesOrganizacionais).values({
        organizacaoId: input.organizacaoId,
        departamentoId: input.departamentoId ?? null,
        nome: input.nome,
        codigo: input.codigo ?? null,
        cargoReferencia: input.cargoReferencia ?? null,
        descricao: input.descricao ?? null,
        origem: "VALIDACAO_ADMIN",
        versao: 1,
        ativa: true,
        createdBy: Number(ctx.user.id),
      });
      return { success: true };
    }),

  atualizar: adminProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        departamentoId: z.number().int().positive().optional().nullable(),
        nome: z.string().trim().min(2).max(255),
        codigo: z.string().trim().max(100).optional().nullable(),
        cargoReferencia: z.string().trim().max(255).optional().nullable(),
        descricao: z.string().trim().max(5000).optional().nullable(),
        ativa: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      const db = await dbObrigatorio();
      await db
        .update(funcoesOrganizacionais)
        .set({
          departamentoId: input.departamentoId ?? null,
          nome: input.nome,
          codigo: input.codigo ?? null,
          cargoReferencia: input.cargoReferencia ?? null,
          descricao: input.descricao ?? null,
          ativa: input.ativa,
        })
        .where(eq(funcoesOrganizacionais.id, input.id));
      return { success: true };
    }),

  validarAjustes: adminProcedure.query(async () => {
    const db = await dbObrigatorio();

    const todosUsuarios = await db
      .select({
        id: users.id,
        name: users.name,
        status: users.status,
        cargo: users.cargo,
      })
      .from(users);

    const vinculos = await db
      .select({
        id: usuariosFuncoesOrganizacionais.id,
        usuarioId: usuariosFuncoesOrganizacionais.usuarioId,
        funcaoOrganizacionalId: usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
        tipoVinculo: usuariosFuncoesOrganizacionais.tipoVinculo,
        ativo: usuariosFuncoesOrganizacionais.ativo,
      })
      .from(usuariosFuncoesOrganizacionais)
      .where(
        and(
          eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
          eq(usuariosFuncoesOrganizacionais.ativo, true),
        ),
      );

    const funcoes = await db
      .select({
        id: funcoesOrganizacionais.id,
        nome: funcoesOrganizacionais.nome,
        ativa: funcoesOrganizacionais.ativa,
      })
      .from(funcoesOrganizacionais);

    const vinculosPorUsuario = new Map<number, typeof vinculos>();
    for (const vinculo of vinculos) {
      const lista = vinculosPorUsuario.get(Number(vinculo.usuarioId)) ?? [];
      lista.push(vinculo);
      vinculosPorUsuario.set(Number(vinculo.usuarioId), lista);
    }

    const funcaoPorId = new Map(
      funcoes.map(funcao => [Number(funcao.id), funcao]),
    );

    const semFuncao = todosUsuarios
      .filter(usuario => (vinculosPorUsuario.get(Number(usuario.id)) ?? []).length === 0)
      .map(usuario => ({
        id: usuario.id,
        nome: usuario.name,
        cargo: usuario.cargo,
        status: usuario.status,
      }));

    const multiplasFuncoesPrincipais = todosUsuarios
      .map(usuario => ({
        usuario,
        vinculos: vinculosPorUsuario.get(Number(usuario.id)) ?? [],
      }))
      .filter(item => item.vinculos.length > 1)
      .map(item => ({
        id: item.usuario.id,
        nome: item.usuario.name,
        quantidade: item.vinculos.length,
      }));

    const contagemPorFuncao = new Map<string, number>();
    for (const usuario of todosUsuarios) {
      const principal = (vinculosPorUsuario.get(Number(usuario.id)) ?? [])[0];
      if (!principal) continue;
      const funcao = funcaoPorId.get(Number(principal.funcaoOrganizacionalId));
      const nome = String(funcao?.nome ?? "").trim();
      if (!nome) continue;
      contagemPorFuncao.set(nome, (contagemPorFuncao.get(nome) ?? 0) + 1);
    }

    const gruposNormalizados = new Map<string, string[]>();
    for (const funcao of funcoes.filter(f => f.ativa)) {
      const nome = String(funcao.nome ?? "").trim();
      if (!nome) continue;
      const chave = nome.toLocaleLowerCase("pt-BR");
      const grupo = gruposNormalizados.get(chave) ?? [];
      if (!grupo.includes(nome)) grupo.push(nome);
      gruposNormalizados.set(chave, grupo);
    }

    const funcoesPossivelmenteDuplicadas = Array.from(gruposNormalizados.values())
      .filter(grupo => grupo.length > 1)
      .map(grupo => ({ nomes: grupo }));

    const distribuicao = Array.from(contagemPorFuncao.entries())
      .map(([funcao, quantidade]) => ({ funcao, quantidade }))
      .sort((a, b) =>
        a.funcao.localeCompare(b.funcao, "pt-BR"),
      );

    return {
      totalUsuarios: todosUsuarios.length,
      totalVinculosPrincipaisAtivos: vinculos.length,
      usuariosSemFuncao: semFuncao.length,
      usuariosComMaisDeUmaFuncaoPrincipal: multiplasFuncoesPrincipais.length,
      totalFuncoesAtivas: funcoes.filter(f => f.ativa).length,
      distribuicao,
      semFuncao,
      multiplasFuncoesPrincipais,
      funcoesPossivelmenteDuplicadas,
      aptoParaBloco1:
        todosUsuarios.length > 0 &&
        semFuncao.length === 0 &&
        multiplasFuncoesPrincipais.length === 0,
      gravacaoExecutada: false,
    };
  }),

  prepararCargaInicial: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    const todosUsuarios = await db
      .select({ id: users.id, cargo: users.cargo, status: users.status })
      .from(users);

    const contagemPorCargo = Object.fromEntries(
      CARGOS_FUNCOES_INICIAIS.map(cargo => [
        cargo,
        todosUsuarios.filter(u => String(u.cargo).trim() === cargo).length,
      ]),
    );

    const naoMapeados = todosUsuarios
      .filter(u => !CARGOS_FUNCOES_INICIAIS.includes(String(u.cargo).trim() as any))
      .map(u => ({ id: u.id, cargo: u.cargo }));

    const vinculosExistentes = await db
      .select({ usuarioId: usuariosFuncoesOrganizacionais.usuarioId })
      .from(usuariosFuncoesOrganizacionais)
      .where(
        and(
          eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
          eq(usuariosFuncoesOrganizacionais.ativo, true),
        ),
      );

    return {
      totalUsuarios: todosUsuarios.length,
      contagemPorCargo,
      cargosEsperados: CARGOS_FUNCOES_INICIAIS,
      naoMapeados,
      vinculosPrincipaisAtivosExistentes: vinculosExistentes.length,
      apto:
        todosUsuarios.length === 187 &&
        naoMapeados.length === 0,
      gravacaoExecutada: false,
    };
  }),

  aplicarCargaInicial: adminProcedure
    .input(z.object({ confirmar: z.literal("CARGA_INICIAL_187") }))
    .mutation(async ({ ctx }) => {
      const db = await dbObrigatorio();
      const hoje = new Date().toISOString().slice(0, 10);

      return db.transaction(async tx => {
        const todosUsuarios = await tx
          .select({ id: users.id, cargo: users.cargo })
          .from(users);

        const naoMapeados = todosUsuarios.filter(
          u => !CARGOS_FUNCOES_INICIAIS.includes(String(u.cargo).trim() as any),
        );

        if (todosUsuarios.length !== 187 || naoMapeados.length > 0) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Carga inicial bloqueada: o cadastro atual não corresponde aos 187 usuários e 7 cargos padronizados.",
          });
        }

        let org = (
          await tx
            .select({ id: organizacoes.id })
            .from(organizacoes)
            .where(eq(organizacoes.codigo, "SEBRAE-TO"))
            .limit(1)
        )[0];

        if (!org) {
          await tx.insert(organizacoes).values({
            nome: "Sebrae Tocantins",
            nomeFantasia: "Sebrae TO",
            codigo: "SEBRAE-TO",
            ativa: true,
          });
          org = (
            await tx
              .select({ id: organizacoes.id })
              .from(organizacoes)
              .where(eq(organizacoes.codigo, "SEBRAE-TO"))
              .limit(1)
          )[0];
        }

        if (!org) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível obter a organização Sebrae Tocantins.",
          });
        }

        const existentes = await tx
          .select({
            id: funcoesOrganizacionais.id,
            cargoReferencia: funcoesOrganizacionais.cargoReferencia,
            ativa: funcoesOrganizacionais.ativa,
          })
          .from(funcoesOrganizacionais)
          .where(eq(funcoesOrganizacionais.organizacaoId, org.id));

        const funcaoPorCargo = new Map<string, number>();
        for (const cargo of CARGOS_FUNCOES_INICIAIS) {
          let funcao = existentes.find(
            f => f.ativa && f.cargoReferencia === cargo,
          );

          if (!funcao) {
            await tx.insert(funcoesOrganizacionais).values({
              organizacaoId: org.id,
              departamentoId: null,
              nome: cargo,
              codigo: `CARGO-${cargo
                .normalize("NFD")
                .replace(/[\\u0300-\\u036f]/g, "")
                .replace(/[^a-zA-Z0-9]+/g, "-")
                .replace(/^-|-$/g, "")
                .toUpperCase()}`,
              cargoReferencia: cargo,
              descricao:
                "Função inicial criada automaticamente a partir do cargo padronizado. Deve ser refinada posteriormente pela análise da função real no Bloco 1.",
              origem: "IMPORTACAO",
              versao: 1,
              vigenciaInicio: hoje,
              ativa: true,
              createdBy: Number(ctx.user.id),
            });

            funcao = (
              await tx
                .select({
                  id: funcoesOrganizacionais.id,
                  cargoReferencia: funcoesOrganizacionais.cargoReferencia,
                  ativa: funcoesOrganizacionais.ativa,
                })
                .from(funcoesOrganizacionais)
                .where(
                  and(
                    eq(funcoesOrganizacionais.organizacaoId, org.id),
                    eq(funcoesOrganizacionais.cargoReferencia, cargo),
                    eq(funcoesOrganizacionais.ativa, true),
                  ),
                )
                .limit(1)
            )[0];
          }

          if (!funcao) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Não foi possível criar/localizar a função inicial para ${cargo}.`,
            });
          }
          funcaoPorCargo.set(cargo, funcao.id);
        }

        const ativosExistentes = await tx
          .select({
            usuarioId: usuariosFuncoesOrganizacionais.usuarioId,
            funcaoOrganizacionalId:
              usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
          })
          .from(usuariosFuncoesOrganizacionais)
          .where(
            and(
              eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
              eq(usuariosFuncoesOrganizacionais.ativo, true),
            ),
          );
        const usuariosComPrincipal = new Set(
          ativosExistentes.map(v => v.usuarioId),
        );

        let criados = 0;
        let preservados = 0;
        for (const usuario of todosUsuarios) {
          if (usuariosComPrincipal.has(usuario.id)) {
            preservados += 1;
            continue;
          }
          const cargo = String(usuario.cargo).trim();
          const funcaoId = funcaoPorCargo.get(cargo);
          if (!funcaoId) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Função inicial não localizada para o cargo ${cargo}.`,
            });
          }

          await tx.insert(usuariosFuncoesOrganizacionais).values({
            usuarioId: usuario.id,
            funcaoOrganizacionalId: funcaoId,
            tipoVinculo: "PRINCIPAL",
            origem: "IMPORTACAO",
            vigenciaInicio: hoje,
            ativo: true,
            createdBy: Number(ctx.user.id),
          });
          criados += 1;
        }

        return {
          success: true,
          organizacaoId: org.id,
          funcoesIniciais: CARGOS_FUNCOES_INICIAIS.length,
          usuariosTotal: todosUsuarios.length,
          vinculosCriados: criados,
          vinculosPrincipaisPreservados: preservados,
        };
      });
    }),

  usuarios: adminProcedure.query(async () => {
    const db = await dbObrigatorio();
    return db
      .select({
        id: users.id,
        name: users.name,
        cargo: users.cargo,
        departamentoId: users.departamentoId,
        departamentoNome: departamentos.nome,
        vinculoId: usuariosFuncoesOrganizacionais.id,
        funcaoOrganizacionalId:
          usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
        funcaoNome: funcoesOrganizacionais.nome,
        tipoVinculo: usuariosFuncoesOrganizacionais.tipoVinculo,
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
      .orderBy(asc(departamentos.nome), asc(users.name));
  }),

  definirFuncaoEmGrupo: adminProcedure
    .input(
      z.object({
        usuarioIds: z.array(z.number().int().positive()).min(1).max(500),
        nomeFuncao: z.string().trim().min(2).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();
      const hoje = new Date().toISOString().slice(0, 10);

      return db.transaction(async tx => {
        const selecionados = await tx
          .select({
            id: users.id,
            cargo: users.cargo,
          })
          .from(users);

        const ids = new Set(input.usuarioIds);
        const usuariosSelecionados = selecionados.filter(u => ids.has(Number(u.id)));

        if (usuariosSelecionados.length !== input.usuarioIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Um ou mais empregados selecionados não foram encontrados.",
          });
        }

        let org = (
          await tx
            .select({ id: organizacoes.id })
            .from(organizacoes)
            .where(eq(organizacoes.codigo, "SEBRAE-TO"))
            .limit(1)
        )[0];

        if (!org) {
          await tx.insert(organizacoes).values({
            nome: "Sebrae Tocantins",
            nomeFantasia: "Sebrae TO",
            codigo: "SEBRAE-TO",
            ativa: true,
          });
          org = (
            await tx
              .select({ id: organizacoes.id })
              .from(organizacoes)
              .where(eq(organizacoes.codigo, "SEBRAE-TO"))
              .limit(1)
          )[0];
        }

        if (!org) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível localizar a organização Sebrae Tocantins.",
          });
        }

        let funcao = (
          await tx
            .select({
              id: funcoesOrganizacionais.id,
              nome: funcoesOrganizacionais.nome,
            })
            .from(funcoesOrganizacionais)
            .where(
              and(
                eq(funcoesOrganizacionais.organizacaoId, org.id),
                eq(funcoesOrganizacionais.nome, input.nomeFuncao),
                eq(funcoesOrganizacionais.ativa, true),
              ),
            )
            .limit(1)
        )[0];

        if (!funcao) {
          const cargos = Array.from(
            new Set(usuariosSelecionados.map(u => String(u.cargo || "").trim()).filter(Boolean)),
          );
          const cargoReferencia = cargos.length === 1 ? cargos[0] : null;

          await tx.insert(funcoesOrganizacionais).values({
            organizacaoId: org.id,
            departamentoId: null,
            nome: input.nomeFuncao,
            cargoReferencia,
            origem: "VALIDACAO_ADMIN",
            versao: 1,
            vigenciaInicio: hoje,
            ativa: true,
            createdBy: Number(ctx.user.id),
          });

          funcao = (
            await tx
              .select({
                id: funcoesOrganizacionais.id,
                nome: funcoesOrganizacionais.nome,
              })
              .from(funcoesOrganizacionais)
              .where(
                and(
                  eq(funcoesOrganizacionais.organizacaoId, org.id),
                  eq(funcoesOrganizacionais.nome, input.nomeFuncao),
                  eq(funcoesOrganizacionais.ativa, true),
                ),
              )
              .limit(1)
          )[0];
        }

        if (!funcao) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível criar ou localizar a função.",
          });
        }

        let alterados = 0;
        let semAlteracao = 0;

        for (const usuario of usuariosSelecionados) {
          const atual = (
            await tx
              .select({
                id: usuariosFuncoesOrganizacionais.id,
                funcaoOrganizacionalId:
                  usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
              })
              .from(usuariosFuncoesOrganizacionais)
              .where(
                and(
                  eq(usuariosFuncoesOrganizacionais.usuarioId, Number(usuario.id)),
                  eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
                  eq(usuariosFuncoesOrganizacionais.ativo, true),
                ),
              )
              .limit(1)
          )[0];

          if (atual?.funcaoOrganizacionalId === funcao.id) {
            semAlteracao += 1;
            continue;
          }

          if (atual) {
            await tx
              .update(usuariosFuncoesOrganizacionais)
              .set({
                ativo: false,
                vigenciaFim: hoje,
              })
              .where(eq(usuariosFuncoesOrganizacionais.id, atual.id));
          }

          await tx.insert(usuariosFuncoesOrganizacionais).values({
            usuarioId: Number(usuario.id),
            funcaoOrganizacionalId: funcao.id,
            tipoVinculo: "PRINCIPAL",
            origem: "VALIDACAO_ADMIN",
            vigenciaInicio: hoje,
            ativo: true,
            createdBy: Number(ctx.user.id),
          });
          alterados += 1;
        }

        return {
          success: true,
          funcaoId: funcao.id,
          funcaoNome: funcao.nome,
          selecionados: usuariosSelecionados.length,
          alterados,
          semAlteracao,
        };
      });
    }),

  definirFuncaoPorNome: adminProcedure
    .input(
      z.object({
        usuarioId: z.number().int().positive(),
        nomeFuncao: z.string().trim().min(2).max(255),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();
      const hoje = new Date().toISOString().slice(0, 10);

      return db.transaction(async tx => {
        const usuario = (
          await tx
            .select({
              id: users.id,
              cargo: users.cargo,
              status: users.status,
            })
            .from(users)
            .where(eq(users.id, input.usuarioId))
            .limit(1)
        )[0];

        if (!usuario) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Empregado não encontrado.",
          });
        }

        let org = (
          await tx
            .select({ id: organizacoes.id })
            .from(organizacoes)
            .where(eq(organizacoes.codigo, "SEBRAE-TO"))
            .limit(1)
        )[0];

        if (!org) {
          await tx.insert(organizacoes).values({
            nome: "Sebrae Tocantins",
            nomeFantasia: "Sebrae TO",
            codigo: "SEBRAE-TO",
            ativa: true,
          });
          org = (
            await tx
              .select({ id: organizacoes.id })
              .from(organizacoes)
              .where(eq(organizacoes.codigo, "SEBRAE-TO"))
              .limit(1)
          )[0];
        }

        if (!org) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível localizar a organização Sebrae Tocantins.",
          });
        }

        let funcao = (
          await tx
            .select({
              id: funcoesOrganizacionais.id,
              nome: funcoesOrganizacionais.nome,
            })
            .from(funcoesOrganizacionais)
            .where(
              and(
                eq(funcoesOrganizacionais.organizacaoId, org.id),
                eq(funcoesOrganizacionais.nome, input.nomeFuncao),
                eq(funcoesOrganizacionais.ativa, true),
              ),
            )
            .limit(1)
        )[0];

        if (!funcao) {
          await tx.insert(funcoesOrganizacionais).values({
            organizacaoId: org.id,
            departamentoId: null,
            nome: input.nomeFuncao,
            cargoReferencia: usuario.cargo,
            origem: "VALIDACAO_ADMIN",
            versao: 1,
            vigenciaInicio: hoje,
            ativa: true,
            createdBy: Number(ctx.user.id),
          });

          funcao = (
            await tx
              .select({
                id: funcoesOrganizacionais.id,
                nome: funcoesOrganizacionais.nome,
              })
              .from(funcoesOrganizacionais)
              .where(
                and(
                  eq(funcoesOrganizacionais.organizacaoId, org.id),
                  eq(funcoesOrganizacionais.nome, input.nomeFuncao),
                  eq(funcoesOrganizacionais.ativa, true),
                ),
              )
              .limit(1)
          )[0];
        }

        if (!funcao) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Não foi possível criar ou localizar a função.",
          });
        }

        const atual = (
          await tx
            .select({
              id: usuariosFuncoesOrganizacionais.id,
              funcaoOrganizacionalId:
                usuariosFuncoesOrganizacionais.funcaoOrganizacionalId,
            })
            .from(usuariosFuncoesOrganizacionais)
            .where(
              and(
                eq(usuariosFuncoesOrganizacionais.usuarioId, input.usuarioId),
                eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
                eq(usuariosFuncoesOrganizacionais.ativo, true),
              ),
            )
            .limit(1)
        )[0];

        if (atual?.funcaoOrganizacionalId === funcao.id) {
          return {
            success: true,
            funcaoId: funcao.id,
            funcaoNome: funcao.nome,
            alteracaoNecessaria: false,
          };
        }

        if (atual) {
          await tx
            .update(usuariosFuncoesOrganizacionais)
            .set({
              ativo: false,
              vigenciaFim: hoje,
            })
            .where(eq(usuariosFuncoesOrganizacionais.id, atual.id));
        }

        await tx.insert(usuariosFuncoesOrganizacionais).values({
          usuarioId: input.usuarioId,
          funcaoOrganizacionalId: funcao.id,
          tipoVinculo: "PRINCIPAL",
          origem: "VALIDACAO_ADMIN",
          vigenciaInicio: hoje,
          ativo: true,
          createdBy: Number(ctx.user.id),
        });

        return {
          success: true,
          funcaoId: funcao.id,
          funcaoNome: funcao.nome,
          alteracaoNecessaria: true,
        };
      });
    }),

  vincularPrincipal: adminProcedure
    .input(
      z.object({
        usuarioId: z.number().int().positive(),
        funcaoOrganizacionalId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = await dbObrigatorio();

      const funcao = await db
        .select({
          id: funcoesOrganizacionais.id,
          ativa: funcoesOrganizacionais.ativa,
        })
        .from(funcoesOrganizacionais)
        .where(eq(funcoesOrganizacionais.id, input.funcaoOrganizacionalId))
        .limit(1);

      if (!funcao[0]?.ativa) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A função selecionada não está ativa.",
        });
      }

      const usuario = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, input.usuarioId), eq(users.status, "ativo")))
        .limit(1);

      if (!usuario.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuário ativo não encontrado.",
        });
      }

      await db.transaction(async tx => {
        await tx
          .update(usuariosFuncoesOrganizacionais)
          .set({
            ativo: false,
            vigenciaFim: new Date().toISOString().slice(0, 10),
          })
          .where(
            and(
              eq(usuariosFuncoesOrganizacionais.usuarioId, input.usuarioId),
              eq(usuariosFuncoesOrganizacionais.tipoVinculo, "PRINCIPAL"),
              eq(usuariosFuncoesOrganizacionais.ativo, true),
            ),
          );

        await tx.insert(usuariosFuncoesOrganizacionais).values({
          usuarioId: input.usuarioId,
          funcaoOrganizacionalId: input.funcaoOrganizacionalId,
          tipoVinculo: "PRINCIPAL",
          origem: "VALIDACAO_ADMIN",
          vigenciaInicio: new Date().toISOString().slice(0, 10),
          ativo: true,
          createdBy: Number(ctx.user.id),
        });
      });

      return { success: true };
    }),
});
