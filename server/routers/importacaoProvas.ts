import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const eixoSchema = z.object({ nome: z.string().trim().min(1).max(255) });
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
  numeroQuestoesDeclarado: z.number().int().positive().max(1000).nullable().optional(),
  questoes: z.array(questaoSchema).min(1).max(1000),
});
const arquivoProvaSchema = z.object({
  arquivoNome: z.string().trim().min(1).max(255),
  prova: provaSchema,
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
  if (prova.numeroQuestoesDeclarado && prova.numeroQuestoesDeclarado !== prova.questoes.length) {
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

function resumo(prova: z.infer<typeof provaSchema>) {
  const validacao = validarEstrutura(prova);
  const eixos = new Set(prova.questoes.flatMap(questao => questao.eixos.map(eixo => eixo.nome.trim())));
  return {
    valido: validacao.erros.length === 0,
    totalQuestoes: prova.questoes.length,
    totalEixosDistintos: eixos.size,
    questoesComMultiplosEixos: prova.questoes.filter(questao => questao.eixos.length > 1).length,
    erros: validacao.erros,
    avisos: validacao.avisos,
  };
}

export const importacaoProvasRouter = router({
  validarLote: adminProcedure.input(z.object({ arquivos: z.array(arquivoProvaSchema).min(1).max(100) })).mutation(async ({ input }) => {
    const chaves = new Set<string>();
    const resultados = input.arquivos.map(item => {
      const r = resumo(item.prova);
      const chave = `${item.prova.codigo.trim().toLocaleLowerCase("pt-BR")}::${item.prova.ano}`;
      if (chaves.has(chave)) r.erros.push(`Código ${item.prova.codigo} / ${item.prova.ano}: prova repetida dentro deste lote.`);
      chaves.add(chave);
      r.valido = r.erros.length === 0;
      return { arquivoNome: item.arquivoNome, codigo: item.prova.codigo, nome: item.prova.nome, unidade: item.prova.unidade, ano: item.prova.ano, ...r };
    });
    return { valido: resultados.every(item => item.valido), totalArquivos: resultados.length, resultados };
  }),

  importarLote: adminProcedure.input(z.object({
    arquivos: z.array(arquivoProvaSchema).min(1).max(100),
    confirmado: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    const chaves = new Set<string>();
    for (const item of input.arquivos) {
      const validacao = validarEstrutura(item.prova);
      if (validacao.erros.length) throw new Error(`${item.arquivoNome}: ${validacao.erros.join(" ")}`);
      const chave = `${item.prova.codigo.trim().toLocaleLowerCase("pt-BR")}::${item.prova.ano}`;
      if (chaves.has(chave)) throw new Error(`O lote contém mais de uma prova com o código ${item.prova.codigo} e ano ${item.prova.ano}.`);
      chaves.add(chave);
    }

    const db = await ensureTables();
    await db.transaction(async (tx: any) => {
      for (const item of input.arquivos) {
        const existenteResult = await tx.execute(sql`
          SELECT id FROM provas_importadas WHERE codigo = ${item.prova.codigo} AND ano = ${item.prova.ano} LIMIT 1
        `);
        const existentes = Array.isArray(existenteResult) ? (existenteResult[0] as any[]) : [];
        if (existentes.length) throw new Error(`Já existe uma prova importada com o código ${item.prova.codigo} e ano ${item.prova.ano}. Nenhuma prova do lote foi gravada.`);
      }

      for (const item of input.arquivos) {
        await tx.execute(sql`
          INSERT INTO provas_importadas
            (codigo, nome, unidade, ano, descricao, total_questoes, questoes_json, arquivo_nome, status, criado_por)
          VALUES
            (${item.prova.codigo}, ${item.prova.nome}, ${item.prova.unidade}, ${item.prova.ano},
             ${item.prova.descricao ?? null}, ${item.prova.questoes.length}, ${JSON.stringify(item.prova.questoes)},
             ${item.arquivoNome}, 'RASCUNHO', ${ctx.user.id})
        `);
      }
    });

    return {
      sucesso: true,
      totalProvas: input.arquivos.length,
      totalQuestoes: input.arquivos.reduce((soma, item) => soma + item.prova.questoes.length, 0),
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
