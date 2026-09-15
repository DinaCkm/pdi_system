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

function normalizarTexto(valor: string) {
  return valor.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
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

    if (letras.size !== questao.opcoes.length) {
      erros.push(`Questão ${questao.id}: há letra de alternativa repetida.`);
    }

    const naoSei = questao.opcoes.filter(opcao => opcao.naoSei);
    if (naoSei.length !== 1) {
      erros.push(`Questão ${questao.id}: deve existir exatamente uma única alternativa marcada como “Não sei”.`);
    }

    const reais = questao.opcoes.filter(opcao => !opcao.naoSei);
    const textosReais = reais.map(opcao => normalizarTexto(opcao.texto));
    if (new Set(textosReais).size !== textosReais.length) {
      erros.push(`Questão ${questao.id}: existem alternativas reais com conteúdo duplicado.`);
    }

    const alternativaNaoSei = naoSei[0];
    if (alternativaNaoSei) {
      const letraNaoSei = alternativaNaoSei.letra;
      const formatoValido =
        (questao.opcoes.length === 5 && letraNaoSei === "E" && !letras.has("F")) ||
        (questao.opcoes.length === 6 && letraNaoSei === "F");
      if (!formatoValido) {
        erros.push(`Questão ${questao.id}: com 4 alternativas reais, E deve ser “Não sei” e F não deve existir; com 5 alternativas reais, F deve ser “Não sei”.`);
      }
    }

    const opcaoGabarito = questao.opcoes.find(opcao => opcao.letra === questao.gabarito);
    if (!opcaoGabarito || opcaoGabarito.naoSei) {
      erros.push(`Questão ${questao.id}: o gabarito deve apontar para uma alternativa real existente. “Não sei” nunca pode ser gabarito.`);
    }

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
    return {
      valido: resultados.some(item => item.valido),
      totalArquivos: resultados.length,
      totalValidos: resultados.filter(item => item.valido).length,
      totalComErro: resultados.filter(item => !item.valido).length,
      resultados,
    };
  }),

  importarLote: adminProcedure.input(z.object({
    arquivos: z.array(arquivoProvaSchema).min(1).max(100),
    confirmado: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    const db = await ensureTables();
    const chaves = new Set<string>();
    const resultados: Array<{
      arquivoNome: string;
      codigo: string;
      ano: number;
      sucesso: boolean;
      motivo?: string;
      totalQuestoes?: number;
    }> = [];

    for (const item of input.arquivos) {
      const validacao = validarEstrutura(item.prova);
      const chave = `${item.prova.codigo.trim().toLocaleLowerCase("pt-BR")}::${item.prova.ano}`;

      if (validacao.erros.length) {
        resultados.push({
          arquivoNome: item.arquivoNome,
          codigo: item.prova.codigo,
          ano: item.prova.ano,
          sucesso: false,
          motivo: validacao.erros.join(" "),
        });
        continue;
      }

      if (chaves.has(chave)) {
        resultados.push({
          arquivoNome: item.arquivoNome,
          codigo: item.prova.codigo,
          ano: item.prova.ano,
          sucesso: false,
          motivo: `Código ${item.prova.codigo} / ${item.prova.ano}: prova repetida dentro deste lote.`,
        });
        continue;
      }
      chaves.add(chave);

      try {
        const existenteResult = await db.execute(sql`
          SELECT id FROM provas_importadas WHERE codigo = ${item.prova.codigo} AND ano = ${item.prova.ano} LIMIT 1
        `);
        const existentes = Array.isArray(existenteResult) ? (existenteResult[0] as any[]) : [];
        if (existentes.length) {
          resultados.push({
            arquivoNome: item.arquivoNome,
            codigo: item.prova.codigo,
            ano: item.prova.ano,
            sucesso: false,
            motivo: `Já existe uma prova importada com o código ${item.prova.codigo} e ano ${item.prova.ano}.`,
          });
          continue;
        }

        await db.transaction(async (tx: any) => {
          await tx.execute(sql`
            INSERT INTO provas_importadas
              (codigo, nome, unidade, ano, descricao, total_questoes, questoes_json, arquivo_nome, status, criado_por)
            VALUES
              (${item.prova.codigo}, ${item.prova.nome}, ${item.prova.unidade}, ${item.prova.ano},
               ${item.prova.descricao ?? null}, ${item.prova.questoes.length}, ${JSON.stringify(item.prova.questoes)},
               ${item.arquivoNome}, 'RASCUNHO', ${ctx.user.id})
          `);
        });

        resultados.push({
          arquivoNome: item.arquivoNome,
          codigo: item.prova.codigo,
          ano: item.prova.ano,
          sucesso: true,
          totalQuestoes: item.prova.questoes.length,
        });
      } catch (error: any) {
        resultados.push({
          arquivoNome: item.arquivoNome,
          codigo: item.prova.codigo,
          ano: item.prova.ano,
          sucesso: false,
          motivo: error?.message || "Não foi possível gravar esta prova.",
        });
      }
    }

    const gravadas = resultados.filter(item => item.sucesso);
    const comErro = resultados.filter(item => !item.sucesso);

    return {
      sucesso: gravadas.length > 0,
      totalProvas: input.arquivos.length,
      totalGravadas: gravadas.length,
      totalComErro: comErro.length,
      totalQuestoes: gravadas.reduce((soma, item) => soma + (item.totalQuestoes ?? 0), 0),
      status: "RASCUNHO",
      resultados,
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
