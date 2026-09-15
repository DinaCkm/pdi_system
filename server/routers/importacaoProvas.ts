import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const eixoSchema = z.object({
  nome: z.string().trim().min(1).max(255),
});

const opcaoSchema = z.object({
  letra: z.enum(["A", "B", "C", "D", "E", "F"]),
  texto: z.string().trim().min(1).max(5000),
  naoSei: z.boolean().default(false),
});

const questaoSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enunciado: z.string().trim().min(1).max(20000),
  opcoes: z.array(opcaoSchema).min(5).max(6),
  gabarito: z.enum(["A", "B", "C", "D", "E"]),
  eixos: z.array(eixoSchema).min(1).max(5),
  macroarea: z.string().trim().max(500).nullable().optional(),
  microarea: z.string().trim().max(500).nullable().optional(),
  tagFonte: z.string().trim().max(2000).nullable().optional(),
});

const provaSchema = z.object({
  codigo: z.string().trim().min(1).max(100),
  nome: z.string().trim().min(1).max(255),
  unidade: z.string().trim().min(1).max(255),
  ano: z.number().int().min(2020).max(2100),
  descricao: z.string().trim().max(5000).nullable().optional(),
  numeroQuestoesDeclarado: z.number().int().positive().max(1000),
  questoes: z.array(questaoSchema).min(1).max(1000),
});

async function ensureTables() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");

  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS provas_importadas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      codigo VARCHAR(100) NOT NULL,
      nome VARCHAR(255) NOT NULL,
      unidade VARCHAR(255) NOT NULL,
      ano INT NOT NULL,
      descricao TEXT NULL,
      total_questoes INT NOT NULL,
      questoes_json LONGTEXT NOT NULL,
      arquivo_nome VARCHAR(255) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
      criado_por INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_provas_importadas_codigo_ano (codigo, ano)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));

  return db;
}

function validarEstrutura(prova: z.infer<typeof provaSchema>) {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (prova.numeroQuestoesDeclarado !== prova.questoes.length) {
    erros.push(`A aba PROVA informa ${prova.numeroQuestoesDeclarado} questão(ões), mas a aba QUESTÕES contém ${prova.questoes.length}.`);
  }

  const ids = new Set<string>();
  prova.questoes.forEach((questao, indice) => {
    const linha = indice + 2;
    const chave = questao.id.toLocaleLowerCase("pt-BR");
    if (ids.has(chave)) erros.push(`Questão ${questao.id}: ID duplicado.`);
    ids.add(chave);

    const letras = new Set(questao.opcoes.map(opcao => opcao.letra));
    for (const letra of ["A", "B", "C", "D", "E"] as const) {
      if (!letras.has(letra)) erros.push(`Linha ${linha}: alternativa ${letra} não informada.`);
    }

    const naoSei = questao.opcoes.filter(opcao => opcao.naoSei);
    if (naoSei.length !== 1) avisos.push(`Questão ${questao.id}: recomenda-se exatamente uma alternativa marcada como “Não sei”.`);

    const eixosNormalizados = questao.eixos.map(eixo => eixo.nome.trim().toLocaleLowerCase("pt-BR"));
    if (new Set(eixosNormalizados).size !== eixosNormalizados.length) {
      erros.push(`Questão ${questao.id}: o mesmo eixo foi informado mais de uma vez.`);
    }
  });

  return { erros, avisos };
}

export const importacaoProvasRouter = router({
  validar: adminProcedure.input(provaSchema).mutation(async ({ input }) => {
    const { erros, avisos } = validarEstrutura(input);
    const eixos = new Set(input.questoes.flatMap(questao => questao.eixos.map(eixo => eixo.nome.trim())));
    const multiplosEixos = input.questoes.filter(questao => questao.eixos.length > 1).length;

    return {
      valido: erros.length === 0,
      totalQuestoes: input.questoes.length,
      totalEixosDistintos: eixos.size,
      questoesComMultiplosEixos: multiplosEixos,
      erros,
      avisos,
    };
  }),

  importar: adminProcedure.input(z.object({
    prova: provaSchema,
    arquivoNome: z.string().trim().min(1).max(255),
    confirmado: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    const validacao = validarEstrutura(input.prova);
    if (validacao.erros.length > 0) {
      throw new Error(`Importação cancelada: ${validacao.erros.length} erro(s) de validação.`);
    }

    const db = await ensureTables();
    const existenteResult = await db.execute(sql`
      SELECT id FROM provas_importadas
      WHERE codigo = ${input.prova.codigo} AND ano = ${input.prova.ano}
      LIMIT 1
    `);
    const linhas = Array.isArray(existenteResult) ? (existenteResult[0] as any[]) : [];
    if (linhas.length > 0) {
      throw new Error("Já existe uma prova importada com este código e ano. Nenhum dado foi alterado.");
    }

    await db.execute(sql`
      INSERT INTO provas_importadas
        (codigo, nome, unidade, ano, descricao, total_questoes, questoes_json, arquivo_nome, status, criado_por)
      VALUES
        (${input.prova.codigo}, ${input.prova.nome}, ${input.prova.unidade}, ${input.prova.ano},
         ${input.prova.descricao ?? null}, ${input.prova.questoes.length}, ${JSON.stringify(input.prova.questoes)},
         ${input.arquivoNome}, 'RASCUNHO', ${ctx.user.id})
    `);

    return {
      sucesso: true,
      codigo: input.prova.codigo,
      nome: input.prova.nome,
      totalQuestoes: input.prova.questoes.length,
      status: "RASCUNHO",
    };
  }),

  listar: adminProcedure.query(async () => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT id, codigo, nome, unidade, ano, total_questoes AS totalQuestoes,
             arquivo_nome AS arquivoNome, status, created_at AS createdAt
      FROM provas_importadas
      ORDER BY created_at DESC, id DESC
    `);
    return Array.isArray(result) ? (result[0] as any[]) : [];
  }),
});
