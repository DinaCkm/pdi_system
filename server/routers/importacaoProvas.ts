import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const eixoRascunhoSchema = z.object({ nome: z.string().max(255) });
const opcaoRascunhoSchema = z.object({
  letra: z.string().max(16),
  texto: z.string().max(5000),
  naoSei: z.boolean().default(false),
});
const questaoRascunhoSchema = z.object({
  id: z.string().max(80),
  enunciado: z.string().max(20000),
  opcoes: z.array(opcaoRascunhoSchema).max(1000),
  gabarito: z.string().max(16),
  eixos: z.array(eixoRascunhoSchema).max(100),
  macroarea: z.string().max(500).nullable().optional(),
  microarea: z.string().max(500).nullable().optional(),
  tagFonte: z.string().max(2000).nullable().optional(),
});
const provaRascunhoSchema = z.object({
  codigo: z.string().trim().min(1).max(100),
  nome: z.string().trim().min(1).max(255),
  unidade: z.string().trim().min(1).max(255),
  ano: z.number().int().min(2020).max(2100),
  descricao: z.string().max(5000).nullable().optional(),
  numeroQuestoesDeclarado: z.number().int().min(0).max(1000).nullable().optional(),
  questoes: z.array(questaoRascunhoSchema).max(1000),
});
const arquivoProvaRascunhoSchema = z.object({
  arquivoNome: z.string().trim().min(1).max(255),
  prova: provaRascunhoSchema,
});

type ProvaRascunho = z.infer<typeof provaRascunhoSchema>;

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
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS provas_importadas_historico (
      id INT AUTO_INCREMENT PRIMARY KEY,
      prova_id INT NOT NULL,
      acao VARCHAR(40) NOT NULL,
      usuario_id INT NULL,
      resumo_json LONGTEXT NULL,
      antes_json LONGTEXT NULL,
      depois_json LONGTEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX provas_importadas_historico_prova_idx (prova_id),
      INDEX provas_importadas_historico_created_idx (created_at)
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

function validarEstrutura(prova: ProvaRascunho) {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (!prova.questoes.length) erros.push("A prova precisa conter pelo menos uma questão para ser validada.");
  if (prova.numeroQuestoesDeclarado !== null && prova.numeroQuestoesDeclarado !== undefined && prova.numeroQuestoesDeclarado !== prova.questoes.length) {
    erros.push(`A aba PROVA informa ${prova.numeroQuestoesDeclarado} questão(ões), mas a prova armazenada contém ${prova.questoes.length}.`);
  }

  const ids = new Set<string>();
  prova.questoes.forEach((questao, indice) => {
    const referencia = questao.id.trim() || `linha ${indice + 2}`;
    const idNormalizado = normalizarTexto(questao.id);

    if (!questao.id.trim()) erros.push(`Questão na linha ${indice + 2}: ID não informado.`);
    else if (ids.has(idNormalizado)) erros.push(`Questão ${questao.id}: ID duplicado.`);
    else ids.add(idNormalizado);

    if (!questao.enunciado.trim()) erros.push(`Questão ${referencia}: enunciado não informado.`);
    if (questao.opcoes.length < 2) erros.push(`Questão ${referencia}: deve existir pelo menos uma alternativa real e uma última alternativa “Não sei”.`);

    const letras = questao.opcoes.map(opcao => opcao.letra.trim().toUpperCase());
    if (letras.some(letra => !letra)) erros.push(`Questão ${referencia}: há alternativa sem identificação de letra.`);
    if (new Set(letras.filter(Boolean)).size !== letras.filter(Boolean).length) erros.push(`Questão ${referencia}: há letra de alternativa repetida.`);

    questao.opcoes.forEach((opcao, opcaoIndex) => {
      if (!opcao.texto.trim()) erros.push(`Questão ${referencia}: alternativa ${opcao.letra || opcaoIndex + 1} sem texto.`);
    });

    const naoSeiPorMarcacaoOuTexto = questao.opcoes.filter(opcao => opcao.naoSei || pareceNaoSei(opcao.texto));
    if (naoSeiPorMarcacaoOuTexto.length !== 1) erros.push(`Questão ${referencia}: deve existir exatamente uma única alternativa “Não sei”.`);

    const ultimaOpcao = questao.opcoes[questao.opcoes.length - 1];
    if (!ultimaOpcao || !ultimaOpcao.naoSei || !pareceNaoSei(ultimaOpcao.texto)) {
      erros.push(`Questão ${referencia}: a última alternativa preenchida deve ser a única opção “Não sei”.`);
    }

    questao.opcoes.slice(0, -1).forEach(opcao => {
      if (opcao.naoSei || pareceNaoSei(opcao.texto)) erros.push(`Questão ${referencia}: “Não sei” só pode aparecer na última alternativa preenchida.`);
    });

    const reais = questao.opcoes.filter(opcao => !opcao.naoSei && !pareceNaoSei(opcao.texto));
    const textosReais = reais.map(opcao => normalizarTexto(opcao.texto)).filter(Boolean);
    if (new Set(textosReais).size !== textosReais.length) erros.push(`Questão ${referencia}: existem alternativas reais com conteúdo duplicado.`);

    if (!questao.gabarito.trim()) {
      erros.push(`Questão ${referencia}: gabarito não informado.`);
    } else {
      const opcaoGabarito = questao.opcoes.find(opcao => opcao.letra.trim().toUpperCase() === questao.gabarito.trim().toUpperCase());
      if (!opcaoGabarito || opcaoGabarito.naoSei || pareceNaoSei(opcaoGabarito.texto)) {
        erros.push(`Questão ${referencia}: o gabarito deve apontar para uma alternativa real existente. “Não sei” nunca pode ser gabarito.`);
      }
    }

    if (!questao.eixos.length) erros.push(`Questão ${referencia}: informe pelo menos um eixo.`);
    const eixosNormalizados = questao.eixos.map(eixo => normalizarTexto(eixo.nome));
    if (eixosNormalizados.some(eixo => !eixo)) erros.push(`Questão ${referencia}: há eixo sem nome.`);
    if (new Set(eixosNormalizados.filter(Boolean)).size !== eixosNormalizados.filter(Boolean).length) erros.push(`Questão ${referencia}: o mesmo eixo foi informado mais de uma vez.`);
  });

  return { erros, avisos };
}

function resumo(prova: ProvaRascunho) {
  const validacao = validarEstrutura(prova);
  const eixos = new Set(
    prova.questoes.flatMap(questao => questao.eixos.map(eixo => eixo.nome.trim()).filter(Boolean)),
  );
  return {
    valido: validacao.erros.length === 0,
    totalQuestoes: prova.questoes.length,
    totalEixosDistintos: eixos.size,
    questoesComMultiplosEixos: prova.questoes.filter(questao => questao.eixos.length > 1).length,
    erros: validacao.erros,
    avisos: validacao.avisos,
  };
}


type AlteracaoAuditoria = {
  campo: string;
  antes: unknown;
  depois: unknown;
};

function valorComparavel(valor: unknown) {
  if (valor === undefined) return null;
  return valor;
}

function mudou(antes: unknown, depois: unknown) {
  return JSON.stringify(valorComparavel(antes)) !== JSON.stringify(valorComparavel(depois));
}

function resumirAlteracoes(antes: ProvaRascunho, depois: ProvaRascunho): AlteracaoAuditoria[] {
  const alteracoes: AlteracaoAuditoria[] = [];
  const camposCabecalho: Array<keyof Pick<ProvaRascunho, "codigo" | "nome" | "unidade" | "ano" | "descricao">> = [
    "codigo",
    "nome",
    "unidade",
    "ano",
    "descricao",
  ];

  for (const campo of camposCabecalho) {
    if (mudou(antes[campo], depois[campo])) {
      alteracoes.push({ campo: `Prova · ${campo}`, antes: antes[campo] ?? null, depois: depois[campo] ?? null });
    }
  }

  const total = Math.max(antes.questoes.length, depois.questoes.length);
  for (let index = 0; index < total; index += 1) {
    const anterior = antes.questoes[index];
    const atual = depois.questoes[index];
    const referencia = atual?.id || anterior?.id || String(index + 1);

    if (!anterior && atual) {
      alteracoes.push({ campo: `Questão ${index + 1} (${referencia}) · adicionada`, antes: null, depois: atual });
      continue;
    }
    if (anterior && !atual) {
      alteracoes.push({ campo: `Questão ${index + 1} (${referencia}) · excluída`, antes: anterior, depois: null });
      continue;
    }
    if (!anterior || !atual) continue;

    const pares: Array<[string, unknown, unknown]> = [
      ["ID", anterior.id, atual.id],
      ["Enunciado", anterior.enunciado, atual.enunciado],
      ["Gabarito", anterior.gabarito, atual.gabarito],
      ["Alternativas", anterior.opcoes, atual.opcoes],
      ["Eixos", anterior.eixos, atual.eixos],
      ["Macroárea", anterior.macroarea ?? null, atual.macroarea ?? null],
      ["Microárea", anterior.microarea ?? null, atual.microarea ?? null],
      ["Fonte / Tag", anterior.tagFonte ?? null, atual.tagFonte ?? null],
    ];

    for (const [rotulo, valorAntes, valorDepois] of pares) {
      if (mudou(valorAntes, valorDepois)) {
        alteracoes.push({
          campo: `Questão ${index + 1} (${referencia}) · ${rotulo}`,
          antes: valorAntes ?? null,
          depois: valorDepois ?? null,
        });
      }
    }
  }

  return alteracoes;
}

async function registrarHistorico(params: {
  db: any;
  provaId: number;
  acao: string;
  usuarioId?: number | null;
  resumo?: unknown;
  antes?: unknown;
  depois?: unknown;
}) {
  await params.db.execute(sql`
    INSERT INTO provas_importadas_historico
      (prova_id, acao, usuario_id, resumo_json, antes_json, depois_json)
    VALUES
      (${params.provaId}, ${params.acao}, ${params.usuarioId ?? null},
       ${params.resumo === undefined ? null : JSON.stringify(params.resumo)},
       ${params.antes === undefined ? null : JSON.stringify(params.antes)},
       ${params.depois === undefined ? null : JSON.stringify(params.depois)})
  `);
}

export const importacaoProvasRouter = router({
  validarLote: adminProcedure.input(z.object({ arquivos: z.array(arquivoProvaRascunhoSchema).min(1).max(100) })).mutation(async ({ input }) => {
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

    const prova = provaRascunhoSchema.safeParse({
      codigo: registro.codigo,
      nome: registro.nome,
      unidade: registro.unidade,
      ano: Number(registro.ano),
      descricao: registro.descricao ?? null,
      numeroQuestoesDeclarado: Number(registro.totalQuestoes),
      questoes,
    });
    if (!prova.success) throw new Error("A prova armazenada possui uma estrutura técnica que não pode ser aberta para edição.");

    return {
      id: Number(registro.id),
      arquivoNome: registro.arquivoNome,
      status: registro.status,
      prova: prova.data,
    };
  }),

  salvarRascunho: adminProcedure.input(z.object({
    id: z.number().int().positive(),
    prova: provaRascunhoSchema,
  })).mutation(async ({ input, ctx }) => {
    const db = await ensureTables();
    const atualResult = await db.execute(sql`
      SELECT id, codigo, nome, unidade, ano, descricao, total_questoes AS totalQuestoes,
             questoes_json AS questoesJson, arquivo_nome AS arquivoNome, status
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

    let questoesAtuais: unknown;
    try {
      questoesAtuais = JSON.parse(atual.questoesJson);
    } catch {
      throw new Error("A versão atual da prova não pôde ser lida para gerar a auditoria.");
    }

    const provaAtualParse = provaRascunhoSchema.safeParse({
      codigo: atual.codigo,
      nome: atual.nome,
      unidade: atual.unidade,
      ano: Number(atual.ano),
      descricao: atual.descricao ?? null,
      numeroQuestoesDeclarado: Number(atual.totalQuestoes),
      questoes: questoesAtuais,
    });
    if (!provaAtualParse.success) throw new Error("A versão atual da prova possui estrutura inválida para auditoria.");

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

    const alteracoes = resumirAlteracoes(provaAtualParse.data, input.prova);

    await db.transaction(async (tx: any) => {
      await tx.execute(sql`
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

      if (alteracoes.length > 0) {
        await registrarHistorico({
          db: tx,
          provaId: input.id,
          acao: "AJUSTE_RASCUNHO",
          usuarioId: ctx.user.id,
          resumo: alteracoes,
          antes: provaAtualParse.data,
          depois: input.prova,
        });
      }
    });

    return {
      id: input.id,
      codigo: input.prova.codigo,
      status: "RASCUNHO",
      totalQuestoes: input.prova.questoes.length,
      salvo: true,
      alteracoes,
      totalAlteracoes: alteracoes.length,
      mensagem: alteracoes.length
        ? `Alterações salvas. ${alteracoes.length} ajuste(s) registrado(s) no histórico de auditoria.`
        : "Nenhuma alteração nova foi identificada. A prova permanece como RASCUNHO.",
    };
  }),

  validarSalva: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
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
      return {
        id: registro.id,
        codigo: registro.codigo,
        status: "RASCUNHO",
        validada: false,
        valido: false,
        totalQuestoes: 0,
        totalEixosDistintos: 0,
        questoesComMultiplosEixos: 0,
        erros: ["Não foi possível ler as questões armazenadas desta prova."],
        avisos: [],
      };
    }

    const provaParse = provaRascunhoSchema.safeParse({
      codigo: registro.codigo,
      nome: registro.nome,
      unidade: registro.unidade,
      ano: Number(registro.ano),
      descricao: registro.descricao ?? null,
      numeroQuestoesDeclarado: Number(registro.totalQuestoes),
      questoes: questoesBrutas,
    });

    if (!provaParse.success) {
      return {
        id: registro.id,
        codigo: registro.codigo,
        status: "RASCUNHO",
        validada: false,
        valido: false,
        totalQuestoes: Array.isArray(questoesBrutas) ? questoesBrutas.length : 0,
        totalEixosDistintos: 0,
        questoesComMultiplosEixos: 0,
        erros: provaParse.error.issues.map(issue => `Estrutura inválida em ${issue.path.join(".") || "prova"}: ${issue.message}`),
        avisos: [],
      };
    }

    const validacao = resumo(provaParse.data);
    if (!validacao.valido) {
      return {
        id: registro.id,
        codigo: registro.codigo,
        status: "RASCUNHO",
        validada: false,
        ...validacao,
      };
    }

    if (registro.status === "RASCUNHO") {
      await db.transaction(async (tx: any) => {
        await tx.execute(sql`
          UPDATE provas_importadas
          SET status = 'VALIDADA'
          WHERE id = ${input.id} AND status = 'RASCUNHO'
        `);
        await registrarHistorico({
          db: tx,
          provaId: input.id,
          acao: "VALIDACAO",
          usuarioId: ctx.user.id,
          resumo: [{ campo: "Status", antes: "RASCUNHO", depois: "VALIDADA" }],
          antes: { status: "RASCUNHO" },
          depois: { status: "VALIDADA" },
        });
      });
    } else if (registro.status !== "VALIDADA") {
      throw new Error(`A prova está com status ${registro.status} e não pode ser validada.`);
    }

    return {
      id: registro.id,
      codigo: registro.codigo,
      status: "VALIDADA",
      validada: true,
      ...validacao,
    };
  }),

  reabrirParaEdicao: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
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

    await db.transaction(async (tx: any) => {
      await tx.execute(sql`
        UPDATE provas_importadas
        SET status = 'RASCUNHO'
        WHERE id = ${input.id} AND status = 'VALIDADA'
      `);
      await registrarHistorico({
        db: tx,
        provaId: input.id,
        acao: "REABERTURA",
        usuarioId: ctx.user.id,
        resumo: [{ campo: "Status", antes: "VALIDADA", depois: "RASCUNHO" }],
        antes: { status: "VALIDADA" },
        depois: { status: "RASCUNHO" },
      });
    });

    return {
      id: registro.id,
      codigo: registro.codigo,
      status: "RASCUNHO",
      reaberta: true,
      mensagem: "Prova reaberta para edição. Será necessário validar novamente antes de utilizá-la em novos processos de avaliação.",
    };
  }),

  importarLote: adminProcedure.input(z.object({
    arquivos: z.array(arquivoProvaRascunhoSchema).min(1).max(100),
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
          const idResult = await tx.execute(sql`SELECT LAST_INSERT_ID() AS id`);
          const idRows = Array.isArray(idResult) ? (idResult[0] as any[]) : [];
          const provaId = Number(idRows[0]?.id ?? 0);
          if (provaId) {
            await registrarHistorico({
              db: tx,
              provaId,
              acao: "IMPORTACAO",
              usuarioId: ctx.user.id,
              resumo: [{ campo: "Prova", antes: null, depois: `${item.prova.codigo} / ${item.prova.ano}` }],
              antes: null,
              depois: item.prova,
            });
          }
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

  historico: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT h.id, h.prova_id AS provaId, h.acao, h.usuario_id AS usuarioId,
             u.name AS usuarioNome, u.email AS usuarioEmail,
             h.resumo_json AS resumoJson, h.created_at AS createdAt
      FROM provas_importadas_historico h
      LEFT JOIN users u ON u.id = h.usuario_id
      WHERE h.prova_id = ${input.id}
      ORDER BY h.created_at DESC, h.id DESC
      LIMIT 200
    `);
    const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
    return linhas.map(item => {
      let resumo: unknown[] = [];
      try { resumo = item.resumoJson ? JSON.parse(item.resumoJson) : []; } catch { resumo = []; }
      return {
        id: Number(item.id),
        provaId: Number(item.provaId),
        acao: item.acao,
        usuarioId: item.usuarioId ? Number(item.usuarioId) : null,
        usuarioNome: item.usuarioNome ?? null,
        usuarioEmail: item.usuarioEmail ?? null,
        createdAt: item.createdAt,
        resumo,
      };
    });
  }),

  listar: adminProcedure.query(async () => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT id, codigo, nome, unidade, ano, total_questoes AS totalQuestoes,
             arquivo_nome AS arquivoNome, status, created_at AS createdAt,
             questoes_json AS questoesJson
      FROM provas_importadas
      ORDER BY created_at DESC, id DESC
    `);
    const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
    return linhas.map(item => {
      let questoes: any[] = [];
      try { questoes = item.questoesJson ? JSON.parse(item.questoesJson) : []; } catch { questoes = []; }
      const eixosTecnicos = Array.from(new Set(
        questoes
          .flatMap(q => Array.isArray(q?.eixos) ? q.eixos : [])
          .map((eixo: any) => String(eixo?.nome ?? "").trim())
          .filter(Boolean),
      )).sort((a, b) => String(a).localeCompare(String(b), "pt-BR"));
      return {
        id: Number(item.id),
        codigo: item.codigo,
        nome: item.nome,
        unidade: item.unidade,
        ano: Number(item.ano),
        totalQuestoes: Number(item.totalQuestoes),
        arquivoNome: item.arquivoNome,
        status: item.status,
        createdAt: item.createdAt,
        eixosTecnicos,
      };
    });
  }),
});
