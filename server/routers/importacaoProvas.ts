import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const eixoSchema = z.object({ nome: z.string().trim().min(1).max(255) });
const opcaoSchema = z.object({
  letra: z.string().trim().min(1).max(4),
  texto: z.string().trim().min(1).max(5000),
  naoSei: z.boolean().default(false),
});
const questaoSchema = z.object({
  id: z.string().trim().min(1).max(80),
  enunciado: z.string().trim().min(1).max(20000),
  opcoes: z.array(opcaoSchema).min(2).max(30),
  gabarito: z.string().trim().min(1).max(4),
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

function pareceNaoSei(valor: string) {
  const normalizado = normalizarTexto(valor);
  return normalizado.includes("nao sei") || normalizado.includes("nao tenho conhecimento") || normalizado.includes("desconheco");
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

    const letras = questao.opcoes.map(opcao => opcao.letra.trim().toUpperCase());
    if (new Set(letras).size !== letras.length) erros.push(`Questão ${questao.id}: há letra de alternativa repetida.`);

    const naoSei = questao.opcoes.filter(opcao => opcao.naoSei);
    if (naoSei.length !== 1) erros.push(`Questão ${questao.id}: deve existir exatamente uma única alternativa marcada como “Não sei”.`);

    const ultimaOpcao = questao.opcoes[questao.opcoes.length - 1];
    if (!ultimaOpcao?.naoSei || !pareceNaoSei(ultimaOpcao.texto)) {
      erros.push(`Questão ${questao.id}: a última alternativa preenchida deve ser a única opção “Não sei”.`);
    }

    questao.opcoes.slice(0, -1).forEach(opcao => {
      if (opcao.naoSei || pareceNaoSei(opcao.texto)) erros.push(`Questão ${questao.id}: “Não sei” só pode aparecer na última alternativa preenchida.`);
    });

    const reais = questao.opcoes.filter(opcao => !opcao.naoSei);
    const textosReais = reais.map(opcao => normalizarTexto(opcao.texto));
    if (new Set(textosReais).size !== textosReais.length) erros.push(`Questão ${questao.id}: existem alternativas reais com conteúdo duplicado.`);

    const opcaoGabarito = questao.opcoes.find(opcao => opcao.letra.trim().toUpperCase() === questao.gabarito.trim().toUpperCase());
    if (!opcaoGabarito || opcaoGabarito.naoSei) {
      erros.push(`Questão ${questao.id}: o gabarito deve apontar para uma alternativa real existente. “Não sei” nunca pode ser gabarito.`);
    }

    const eixosNormalizados = questao.eixos.map(eixo => eixo.nome.trim().toLocaleLowerCase("pt-BR"));
    if (new Set(eixosNormalizados).size !== eixosNormalizados.length) erros.push(`Questão ${questao.id}: o mesmo eixo foi informado mais de uma vez.`);

    if (!questao.opcoes.length) erros.push(`Linha ${linha}: nenhuma alternativa informada.`);
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

  obter: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT id, codigo, nome, unidade, ano, descricao, total_questoes AS totalQuestoes,
             questoes_json AS questoesJson, arquivo_nome AS arquivoNome, status
      FROM provas_importadas
      WHERE id = ${input.id}
      LIMIT 1
    `);
    const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
    if (!linhas.length) throw new Error("Prova não encontrada.");

    const registro = linhas[0];
    let questoes: unknown;
    try {
      questoes = JSON.parse(registro.questoesJson);
    } catch {
      throw new Error("Não foi possível ler as questões armazenadas desta prova.");
    }

    return {
      id: Number(registro.id),
      arquivoNome: registro.arquivoNome,
      status: registro.status,
      prova: {
        codigo: registro.codigo,
        nome: registro.nome,
        unidade: registro.unidade,
        ano: Number(registro.ano),
        descricao: registro.descricao ?? null,
        numeroQuestoesDeclarado: Number(registro.totalQuestoes),
        questoes,
      },
    };
  }),

  salvarRascunho: adminProcedure.input(z.object({
    id: z.number().int().positive(),
    prova: provaSchema,
  })).mutation(async ({ input }) => {
    const db = await ensureTables();
    const atualResult = await db.execute(sql`
      SELECT id, codigo, ano, status
      FROM provas_importadas
      WHERE id = ${input.id}
      LIMIT 1
    `);
    const atuais = Array.isArray(atualResult) ? (atualResult[0] as any[]) : [];
    if (!atuais.length) throw new Error("Prova não encontrada.");

    const atual = atuais[0];
    if (atual.status !== "RASCUNHO") {
      throw new Error("A prova precisa estar como RASCUNHO para ser editada.");
    }

    const duplicadaResult = await db.execute(sql`
      SELECT id
      FROM provas_importadas
      WHERE codigo = ${input.prova.codigo} AND ano = ${input.prova.ano} AND id <> ${input.id}
      LIMIT 1
    `);
    const duplicadas = Array.isArray(duplicadaResult) ? (duplicadaResult[0] as any[]) : [];
    if (duplicadas.length) {
      throw new Error(`Já existe outra prova com o código ${input.prova.codigo} e ano ${input.prova.ano}.`);
    }

    await db.execute(sql`
      UPDATE provas_importadas
      SET codigo = ${input.prova.codigo},
          nome = ${input.prova.nome},
          unidade = ${input.prova.unidade},
          ano = ${input.prova.ano},
          descricao = ${input.prova.descricao ?? null},
          total_questoes = ${input.prova.questoes.length},
          questoes_json = ${JSON.stringify(input.prova.questoes)},
          status = 'RASCUNHO'
      WHERE id = ${input.id} AND status = 'RASCUNHO'
    `);

    return {
      id: input.id,
      codigo: input.prova.codigo,
      status: "RASCUNHO",
      totalQuestoes: input.prova.questoes.length,
      salvo: true,
      mensagem: "Alterações salvas. A prova permanece como RASCUNHO até ser validada novamente.",
    };
  }),

  validarSalva: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT id, codigo, nome, unidade, ano, descricao, total_questoes AS totalQuestoes,
             questoes_json AS questoesJson, arquivo_nome AS arquivoNome, status
      FROM provas_importadas
      WHERE id = ${input.id}
      LIMIT 1
    `);
    const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
    if (!linhas.length) throw new Error("Prova não encontrada.");

    const registro = linhas[0];
    let questoesBrutas: unknown;
    try {
      questoesBrutas = JSON.parse(registro.questoesJson);
    } catch {
      throw new Error("Não foi possível ler as questões armazenadas desta prova.");
    }

    const prova = provaSchema.parse({
      codigo: registro.codigo,
      nome: registro.nome,
      unidade: registro.unidade,
      ano: Number(registro.ano),
      descricao: registro.descricao ?? null,
      numeroQuestoesDeclarado: Number(registro.totalQuestoes),
      questoes: questoesBrutas,
    });

    const validacao = resumo(prova);
    if (!validacao.valido) {
      return {
        id: registro.id,
        codigo: registro.codigo,
        status: "RASCUNHO",
        validada: false,
        ...validacao,
      };
    }

    await db.execute(sql`
      UPDATE provas_importadas
      SET status = 'VALIDADA'
      WHERE id = ${input.id} AND status = 'RASCUNHO'
    `);

    return {
      id: registro.id,
      codigo: registro.codigo,
      status: "VALIDADA",
      validada: true,
      ...validacao,
    };
  }),

  reabrirParaEdicao: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT id, codigo, status
      FROM provas_importadas
      WHERE id = ${input.id}
      LIMIT 1
    `);
    const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
    if (!linhas.length) throw new Error("Prova não encontrada.");

    const registro = linhas[0];
    if (registro.status === "RASCUNHO") {
      return {
        id: registro.id,
        codigo: registro.codigo,
        status: "RASCUNHO",
        reaberta: false,
        mensagem: "A prova já está em modo de edição.",
      };
    }

    if (registro.status !== "VALIDADA") {
      throw new Error(`A prova está com status ${registro.status} e não pode ser reaberta para edição.`);
    }

    await db.execute(sql`
      UPDATE provas_importadas
      SET status = 'RASCUNHO'
      WHERE id = ${input.id} AND status = 'VALIDADA'
    `);

    return {
      id: registro.id,
      codigo: registro.codigo,
      status: "RASCUNHO",
      reaberta: true,
      mensagem: "Prova reaberta para edição. Será necessário validar novamente antes de utilizá-la em novos processos de avaliação.",
    };
  }),

  importarLote: adminProcedure.input(z.object({
    arquivos: z.array(arquivoProvaSchema).min(1).max(100),
    confirmado: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    const db = await ensureTables();
    const chaves = new Set<string>();
    const resultados: Array<{ arquivoNome: string; codigo: string; ano: number; sucesso: boolean; motivo?: string; totalQuestoes?: number }> = [];

    for (const item of input.arquivos) {
      const chave = `${item.prova.codigo.trim().toLocaleLowerCase("pt-BR")}::${item.prova.ano}`;
      if (chaves.has(chave)) {
        resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: false, motivo: `Código ${item.prova.codigo} / ${item.prova.ano}: prova repetida dentro deste lote.` });
        continue;
      }
      chaves.add(chave);

      try {
        const existenteResult = await db.execute(sql`SELECT id FROM provas_importadas WHERE codigo = ${item.prova.codigo} AND ano = ${item.prova.ano} LIMIT 1`);
        const existentes = Array.isArray(existenteResult) ? (existenteResult[0] as any[]) : [];
        if (existentes.length) {
          resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: false, motivo: `Já existe uma prova importada com o código ${item.prova.codigo} e ano ${item.prova.ano}.` });
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

        resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: true, totalQuestoes: item.prova.questoes.length });
      } catch (error: any) {
        resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: false, motivo: error?.message || "Não foi possível gravar esta prova como rascunho." });
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
