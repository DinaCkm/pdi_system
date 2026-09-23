import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";
import {
  ensureHomologacaoTables,
  invalidarHomologacoes,
  marcarPendenciaHomologacao,
} from "../services/homologacaoProvas";

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
  cicloId: z.number().int().positive().nullable().optional(),
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
      ciclo_id INT NULL,
      descricao TEXT NULL,
      total_questoes INT NOT NULL,
      questoes_json LONGTEXT NOT NULL,
      arquivo_nome VARCHAR(255) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'RASCUNHO',
      criado_por INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_provas_importadas_codigo_ano (codigo, ano),
      INDEX provas_importadas_ciclo_idx (ciclo_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `));
  const colunaCicloResult = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'provas_importadas'
      AND COLUMN_NAME = 'ciclo_id'
  `);
  const colunaCicloRows = Array.isArray(colunaCicloResult) ? (colunaCicloResult[0] as any[]) : [];
  if (Number(colunaCicloRows[0]?.total ?? 0) === 0) {
    await db.execute(sql.raw(`
      ALTER TABLE provas_importadas
        ADD COLUMN ciclo_id INT NULL AFTER ano,
        ADD INDEX provas_importadas_ciclo_idx (ciclo_id)
    `));
  }

  await ensureHomologacaoTables(db);

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

  // Migração segura dos rascunhos/provas atuais já existentes.
  // Regra confirmada: provas novas = ciclo 2026/2. Provas históricas serão carregadas depois no ciclo 2026/1.
  const cicloAtualResult = await db.execute(sql`
    SELECT id, nome
    FROM ciclos
    WHERE nome = '2026/2'
    LIMIT 1
  `);
  const cicloAtualRows = Array.isArray(cicloAtualResult) ? (cicloAtualResult[0] as any[]) : [];
  const cicloAtual = cicloAtualRows[0] ?? null;

  if (cicloAtual?.id) {
    const semCicloResult = await db.execute(sql`
      SELECT id
      FROM provas_importadas
      WHERE ciclo_id IS NULL
        AND ano = 2026
        AND UPPER(codigo) NOT LIKE '%HIST%'
        AND UPPER(nome) NOT LIKE '%HIST%'
        AND UPPER(codigo) NOT LIKE '%ERRO_NAO_USAR%'
    `);
    const semCiclo = Array.isArray(semCicloResult) ? (semCicloResult[0] as any[]) : [];

    for (const prova of semCiclo) {
      await db.transaction(async (tx: any) => {
        await tx.execute(sql`
          UPDATE provas_importadas
          SET ciclo_id = ${Number(cicloAtual.id)}
          WHERE id = ${Number(prova.id)} AND ciclo_id IS NULL
        `);
        await tx.execute(sql`
          INSERT INTO provas_importadas_historico
            (prova_id, acao, usuario_id, resumo_json, antes_json, depois_json)
          VALUES
            (${Number(prova.id)}, 'VINCULO_CICLO', NULL,
             ${JSON.stringify([{ campo: "Ciclo do PDI", antes: null, depois: "2026/2" }])},
             ${JSON.stringify({ cicloId: null })},
             ${JSON.stringify({ cicloId: Number(cicloAtual.id), cicloNome: "2026/2" })})
        `);
      });
    }
  }

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

  if (!prova.cicloId) erros.push("Selecione o Ciclo do PDI para esta prova.");
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
  const camposCabecalho: Array<keyof Pick<ProvaRascunho, "codigo" | "nome" | "unidade" | "ano" | "cicloId" | "descricao">> = [
    "codigo",
    "nome",
    "unidade",
    "ano",
    "cicloId",
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

async function obterCiclo(db: any, cicloId: number | null | undefined) {
  if (!cicloId) return null;
  const result = await db.execute(sql`
    SELECT id, nome
    FROM ciclos
    WHERE id = ${cicloId}
    LIMIT 1
  `);
  const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
  return linhas[0] ?? null;
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
      SELECT id, codigo, nome, unidade, ano, ciclo_id AS cicloId, descricao, total_questoes AS totalQuestoes,
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
      cicloId: registro.cicloId ? Number(registro.cicloId) : null,
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
      SELECT id, codigo, nome, unidade, ano, ciclo_id AS cicloId, descricao, total_questoes AS totalQuestoes,
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
      cicloId: atual.cicloId ? Number(atual.cicloId) : null,
      descricao: atual.descricao ?? null,
      numeroQuestoesDeclarado: Number(atual.totalQuestoes),
      questoes: questoesAtuais,
    });
    if (!provaAtualParse.success) throw new Error("A versão atual da prova possui estrutura inválida para auditoria.");

    if (!input.prova.cicloId) {
      throw new Error("Selecione o Ciclo do PDI antes de salvar a prova.");
    }
    const ciclo = await obterCiclo(db, input.prova.cicloId);
    if (!ciclo) {
      throw new Error("O Ciclo do PDI selecionado não existe mais. Atualize a tela e selecione um ciclo válido.");
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

    const alteracoes = resumirAlteracoes(provaAtualParse.data, input.prova);

    await db.transaction(async (tx: any) => {
      await tx.execute(sql`
        UPDATE provas_importadas
        SET codigo = ${input.prova.codigo},
            nome = ${input.prova.nome},
            unidade = ${input.prova.unidade},
            ano = ${input.prova.ano},
            ciclo_id = ${input.prova.cicloId},
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
      SELECT id, codigo, nome, unidade, ano, ciclo_id AS cicloId, descricao, total_questoes AS totalQuestoes,
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
      cicloId: registro.cicloId ? Number(registro.cicloId) : null,
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
    if (provaParse.data.cicloId) {
      const ciclo = await obterCiclo(db, provaParse.data.cicloId);
      if (!ciclo) validacao.erros.push("O Ciclo do PDI vinculado a esta prova não existe mais.");
      validacao.valido = validacao.erros.length === 0;
    }
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
      await marcarPendenciaHomologacao(db, input.id);
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
      await invalidarHomologacoes(tx, input.id, "INVALIDADA_POR_EDICAO");
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

  invalidar: adminProcedure.input(z.object({
    id: z.number().int().positive(),
    justificativa: z.string().trim().min(10, "Informe uma justificativa com pelo menos 10 caracteres.").max(2000),
  })).mutation(async ({ input, ctx }) => {
    const db = await ensureTables();
    const result = await db.execute(sql`
      SELECT id, codigo, nome, status
      FROM provas_importadas
      WHERE id = ${input.id}
      LIMIT 1
    `);
    const linhas = Array.isArray(result) ? (result[0] as any[]) : [];
    if (!linhas.length) throw new Error("Prova não encontrada.");

    const registro = linhas[0];
    if (registro.status === "INVALIDADA") {
      return {
        id: Number(registro.id),
        codigo: registro.codigo,
        status: "INVALIDADA",
        invalidada: false,
        mensagem: "Esta prova já está invalidada.",
      };
    }

    if (!["RASCUNHO", "VALIDADA"].includes(String(registro.status))) {
      throw new Error(`A prova está com status ${registro.status} e não pode ser invalidada.`);
    }

    await db.transaction(async (tx: any) => {
      await tx.execute(sql`
        UPDATE provas_importadas
        SET status = 'INVALIDADA'
        WHERE id = ${input.id}
          AND status IN ('RASCUNHO','VALIDADA')
      `);
      await invalidarHomologacoes(tx, input.id, "INVALIDADA_POR_PROVA");

      await registrarHistorico({
        db: tx,
        provaId: input.id,
        acao: "INVALIDACAO",
        usuarioId: ctx.user.id,
        resumo: [
          { campo: "Status", antes: registro.status, depois: "INVALIDADA" },
          { campo: "Justificativa", antes: null, depois: input.justificativa },
        ],
        antes: { status: registro.status },
        depois: { status: "INVALIDADA", justificativa: input.justificativa },
      });
    });

    return {
      id: Number(registro.id),
      codigo: registro.codigo,
      status: "INVALIDADA",
      invalidada: true,
      mensagem: "Prova invalidada. Ela foi preservada para auditoria e não poderá ser usada em novas aplicações.",
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
        if (!item.prova.cicloId) {
          resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: false, motivo: "Selecione o Ciclo do PDI antes de gravar a prova." });
          continue;
        }
        const ciclo = await obterCiclo(db, item.prova.cicloId);
        if (!ciclo) {
          resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: false, motivo: "O Ciclo do PDI selecionado não existe mais. Atualize a tela e tente novamente." });
          continue;
        }

        const existenteResult = await db.execute(sql`SELECT id FROM provas_importadas WHERE codigo = ${item.prova.codigo} AND ano = ${item.prova.ano} LIMIT 1`);
        const existentes = Array.isArray(existenteResult) ? (existenteResult[0] as any[]) : [];
        if (existentes.length) {
          resultados.push({ arquivoNome: item.arquivoNome, codigo: item.prova.codigo, ano: item.prova.ano, sucesso: false, motivo: `Já existe uma prova importada com o código ${item.prova.codigo} e ano ${item.prova.ano}.` });
          continue;
        }

        await db.transaction(async (tx: any) => {
          await tx.execute(sql`
            INSERT INTO provas_importadas
              (codigo, nome, unidade, ano, ciclo_id, descricao, total_questoes, questoes_json, arquivo_nome, status, criado_por)
            VALUES
              (${item.prova.codigo}, ${item.prova.nome}, ${item.prova.unidade}, ${item.prova.ano}, ${item.prova.cicloId},
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

  replicarEixos: adminProcedure.input(z.object({
    origemId: z.number().int().positive(),
    destinoIds: z.array(z.number().int().positive()).min(1).max(20),
  })).mutation(async ({ input, ctx }) => {
    const db = await ensureTables();

    const mapasPorRegional: Record<string, number[]> = {
      RBP: Array.from({ length: 65 }, (_, indice) => indice + 1),
      RMN: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,52,25,24,26,27,28,31,38,34,42,37,33,56,53,57,58,59,60,61,62,50,51,49,65,64,55,44,46,54,48,45,23,47,63,41,30,35,40,39,29,32,36,43],
      RNO: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,52,25,24,26,27,28,31,38,34,42,37,33,56,53,57,58,59,60,61,62,50,51,49,65,64,55,44,46,54,48,45,23,47,63,41,30,35,40,39,29,32,36,43],
      RSG: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,52,25,24,26,27,28,31,38,34,42,37,33,56,53,57,58,59,60,61,62,50,51,49,65,64,55,44,46,54,48,45,23,47,63,41,30,35,40,39,29,32,36,43],
      RSU: Array.from({ length: 65 }, (_, indice) => indice + 1),
      RVA: [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,52,25,24,26,27,28,31,38,34,42,37,33,56,53,57,58,59,60,61,62,50,51,49,65,64,55,44,46,54,48,45,23,47,63,41,30,35,40,39,29,32,36,43],
    };

    const identificarRegional = (registro: any) => {
      const texto = normalizarTexto([registro.codigo, registro.nome, registro.unidade].filter(Boolean).join(" "));
      const regras: Array<[string, string[]]> = [
        ["RBP", ["rbp", "bico do papagaio"]],
        ["RMN", ["rmn", "medio norte", "norte colinas"]],
        ["RNO", ["rno", "regional norte"]],
        ["RSG", ["rsg", "serras gerais"]],
        ["RSU", ["rsu", "regional sul"]],
        ["RVA", ["rva", "vale do araguaia"]],
      ];
      for (const [codigo, termos] of regras) {
        if (codigo === "RNO" && (texto.includes("medio norte") || texto.includes("norte colinas"))) continue;
        if (termos.some(termo => texto.includes(termo))) return codigo;
      }
      return null;
    };

    const ids = Array.from(new Set([input.origemId, ...input.destinoIds]));
    if (ids.length !== input.destinoIds.length + 1) {
      throw new Error("A prova de origem não pode também aparecer entre as provas de destino.");
    }

    const registrosResult = await db.execute(sql`
      SELECT id, codigo, nome, unidade, status, total_questoes AS totalQuestoes, questoes_json AS questoesJson
      FROM provas_importadas
      WHERE id IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})
    `);
    const registros = Array.isArray(registrosResult) ? (registrosResult[0] as any[]) : [];

    const porId = new Map<number, any>(registros.map(item => [Number(item.id), item]));
    const origem = porId.get(input.origemId);
    if (!origem) throw new Error("Prova de referência não encontrada.");

    const faltantes = input.destinoIds.filter(id => !porId.has(id));
    if (faltantes.length) throw new Error("Uma ou mais provas de destino não foram encontradas.");

    let questoesOrigem: any[];
    try {
      questoesOrigem = JSON.parse(origem.questoesJson);
    } catch {
      throw new Error("Não foi possível ler as questões da prova de referência.");
    }
    if (!Array.isArray(questoesOrigem) || questoesOrigem.length !== 65) {
      throw new Error("A prova de referência precisa conter exatamente 65 questões.");
    }

    const origemPorNumero = new Map<number, any>();
    const eixosOrigem = new Set<string>();
    for (const questao of questoesOrigem) {
      const numero = Number(String(questao?.id ?? "").trim());
      if (!Number.isInteger(numero) || numero < 1 || numero > 65 || origemPorNumero.has(numero)) {
        throw new Error("A prova de referência precisa possuir IDs numéricos únicos de 1 a 65.");
      }
      const eixos = Array.isArray(questao?.eixos) ? questao.eixos : [];
      if (eixos.length !== 1 || !String(eixos[0]?.nome ?? "").trim()) {
        throw new Error(`A questão ${questao?.id ?? "?"} da prova de referência precisa possuir exatamente um eixo técnico principal.`);
      }
      const eixo = String(eixos[0].nome).trim();
      eixosOrigem.add(eixo);
      origemPorNumero.set(numero, { eixo });
    }
    if (origemPorNumero.size !== 65 || eixosOrigem.size !== 11) {
      throw new Error(`A prova de referência precisa ter 65 questões e exatamente 11 eixos distintos. Foram encontrados ${origemPorNumero.size} questões e ${eixosOrigem.size} eixos.`);
    }

    const preparados: Array<{
      id: number;
      codigo: string;
      regional: string;
      questoesAntes: any[];
      questoesDepois: any[];
      alteracoes: any[];
    }> = [];
    const regionaisUsadas = new Set<string>();

    for (const destinoId of input.destinoIds) {
      const destino = porId.get(destinoId);
      const regional = identificarRegional(destino);
      if (!regional || !mapasPorRegional[regional]) {
        throw new Error(`Não foi possível identificar com segurança a Regional da prova ${destino.codigo}.`);
      }
      if (regionaisUsadas.has(regional)) {
        throw new Error(`Há mais de uma prova de destino identificada como ${regional}. Nenhuma alteração foi gravada.`);
      }
      regionaisUsadas.add(regional);

      if (destino.status !== "RASCUNHO") {
        throw new Error(`A prova ${destino.codigo} precisa estar como RASCUNHO antes de receber os eixos.`);
      }

      const usoResult = await db.execute(sql`
        SELECT COUNT(*) AS total
        FROM aplicacoes_proficiencia
        WHERE prova_id = ${destinoId}
      `);
      const usoRows = Array.isArray(usoResult) ? (usoResult[0] as any[]) : [];
      if (Number(usoRows[0]?.total ?? 0) > 0) {
        throw new Error(`A prova ${destino.codigo} já possui aplicação vinculada e não pode receber a sincronização automática de eixos.`);
      }

      let questoesDestino: any[];
      try {
        questoesDestino = JSON.parse(destino.questoesJson);
      } catch {
        throw new Error(`Não foi possível ler as questões da prova ${destino.codigo}.`);
      }
      if (!Array.isArray(questoesDestino) || questoesDestino.length !== 65) {
        throw new Error(`A prova ${destino.codigo} precisa conter exatamente 65 questões.`);
      }

      const mapa = mapasPorRegional[regional];
      const idsDestino = new Set<number>();
      const alteracoes: any[] = [];
      const questoesDepois = questoesDestino.map((questao: any) => {
        const numeroDestino = Number(String(questao?.id ?? "").trim());
        if (!Number.isInteger(numeroDestino) || numeroDestino < 1 || numeroDestino > 65 || idsDestino.has(numeroDestino)) {
          throw new Error(`A prova ${destino.codigo} precisa possuir IDs numéricos únicos de 1 a 65.`);
        }
        idsDestino.add(numeroDestino);

        const numeroReferencia = mapa[numeroDestino - 1];
        const referencia = origemPorNumero.get(numeroReferencia);
        if (!referencia) {
          throw new Error(`Não foi encontrada a questão de referência ${numeroReferencia} para a questão ${numeroDestino} da prova ${destino.codigo}.`);
        }

        const antes = Array.isArray(questao?.eixos)
          ? questao.eixos.map((eixo: any) => String(eixo?.nome ?? "").trim()).filter(Boolean)
          : [];
        const depois = [referencia.eixo];
        if (JSON.stringify(antes) !== JSON.stringify(depois)) {
          alteracoes.push({
            campo: `Questão ${numeroDestino} · Eixo técnico`,
            antes,
            depois,
            referenciaQuestao: numeroReferencia,
          });
        }
        return { ...questao, eixos: [{ nome: referencia.eixo }] };
      });

      if (idsDestino.size !== 65) {
        throw new Error(`A prova ${destino.codigo} não possui o conjunto completo de IDs de 1 a 65.`);
      }

      const eixosDepois = new Set(
        questoesDepois.flatMap((questao: any) =>
          Array.isArray(questao?.eixos)
            ? questao.eixos.map((eixo: any) => String(eixo?.nome ?? "").trim()).filter(Boolean)
            : []
        )
      );
      if (eixosDepois.size !== 11) {
        throw new Error(`A prova ${destino.codigo} terminaria com ${eixosDepois.size} eixos distintos, e não 11. Nenhuma alteração foi gravada.`);
      }

      preparados.push({
        id: destinoId,
        codigo: destino.codigo,
        regional,
        questoesAntes: questoesDestino,
        questoesDepois,
        alteracoes,
      });
    }

    await db.transaction(async (tx: any) => {
      for (const item of preparados) {
        if (!item.alteracoes.length) continue;
        await tx.execute(sql`
          UPDATE provas_importadas
          SET questoes_json = ${JSON.stringify(item.questoesDepois)}
          WHERE id = ${item.id} AND status = 'RASCUNHO'
        `);
        await registrarHistorico({
          db: tx,
          provaId: item.id,
          acao: "SINCRONIZACAO_EIXOS_REGIONAIS",
          usuarioId: ctx.user.id,
          resumo: [
            { campo: "Regional", antes: null, depois: item.regional },
            { campo: "Base canônica", antes: null, depois: origem.codigo },
            { campo: "Regra de correspondência", antes: null, depois: "Banco de 65 itens da prova Regional 2026, com ordem específica por Regional" },
            { campo: "Total de questões ajustadas", antes: null, depois: item.alteracoes.length },
            ...item.alteracoes,
          ],
          antes: { questoes: item.questoesAntes.map(q => ({ id: q?.id, eixos: q?.eixos ?? [] })) },
          depois: { questoes: item.questoesDepois.map(q => ({ id: q?.id, eixos: q?.eixos ?? [] })) },
        });
      }
    });

    return {
      origem: { id: Number(origem.id), codigo: origem.codigo },
      eixos: Array.from(eixosOrigem).sort((a, b) => a.localeCompare(b, "pt-BR")),
      resultados: preparados.map(item => ({
        id: item.id,
        codigo: item.codigo,
        regional: item.regional,
        questoesAjustadas: item.alteracoes.length,
      })),
      mensagem: "Eixos das Regionais sincronizados. Somente o campo de eixo técnico foi alterado; enunciados, alternativas e gabaritos foram preservados.",
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
      SELECT p.id, p.codigo, p.nome, p.unidade, p.ano, p.ciclo_id AS cicloId, c.nome AS cicloNome,
             p.total_questoes AS totalQuestoes, p.arquivo_nome AS arquivoNome, p.status,
             p.created_at AS createdAt, p.questoes_json AS questoesJson,
             (
               SELECT ph.status
               FROM provas_importadas_homologacao ph
               WHERE ph.prova_id = p.id
               ORDER BY ph.id DESC
               LIMIT 1
             ) AS homologacaoStatus,
             (
               SELECT ph.aplicacao_teste_id
               FROM provas_importadas_homologacao ph
               WHERE ph.prova_id = p.id
               ORDER BY ph.id DESC
               LIMIT 1
             ) AS aplicacaoTesteId,
             (
               SELECT ph.testada_em
               FROM provas_importadas_homologacao ph
               WHERE ph.prova_id = p.id
               ORDER BY ph.id DESC
               LIMIT 1
             ) AS testadaEm,
             (
               SELECT ph.homologada_em
               FROM provas_importadas_homologacao ph
               WHERE ph.prova_id = p.id
               ORDER BY ph.id DESC
               LIMIT 1
             ) AS homologadaEm,
             (
               SELECT h.resumo_json
               FROM provas_importadas_historico h
               WHERE h.prova_id = p.id
                 AND h.acao = 'INVALIDACAO'
               ORDER BY h.created_at DESC, h.id DESC
               LIMIT 1
             ) AS invalidacaoResumoJson,
             (
               SELECT h.created_at
               FROM provas_importadas_historico h
               WHERE h.prova_id = p.id
                 AND h.acao = 'INVALIDACAO'
               ORDER BY h.created_at DESC, h.id DESC
               LIMIT 1
             ) AS invalidadaEm
      FROM provas_importadas p
      LEFT JOIN ciclos c ON c.id = p.ciclo_id
      ORDER BY p.created_at DESC, p.id DESC
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
      let invalidacaoMotivo: string | null = null;
      if (item.status === "INVALIDADA" && item.invalidacaoResumoJson) {
        try {
          const resumoInvalidacao = JSON.parse(item.invalidacaoResumoJson);
          const justificativa = Array.isArray(resumoInvalidacao)
            ? resumoInvalidacao.find((entrada: any) => entrada?.campo === "Justificativa")
            : null;
          invalidacaoMotivo = justificativa?.depois ? String(justificativa.depois) : null;
        } catch {
          invalidacaoMotivo = null;
        }
      }
      return {
        id: Number(item.id),
        codigo: item.codigo,
        nome: item.nome,
        unidade: item.unidade,
        ano: Number(item.ano),
        cicloId: item.cicloId ? Number(item.cicloId) : null,
        cicloNome: item.cicloNome ?? null,
        totalQuestoes: Number(item.totalQuestoes),
        arquivoNome: item.arquivoNome,
        status: item.status,
        homologacaoStatus: item.homologacaoStatus ?? null,
        aplicacaoTesteId: item.aplicacaoTesteId ? Number(item.aplicacaoTesteId) : null,
        testadaEm: item.testadaEm ?? null,
        homologadaEm: item.homologadaEm ?? null,
        invalidacaoMotivo,
        invalidadaEm: item.invalidadaEm ?? null,
        createdAt: item.createdAt,
        eixosTecnicos,
      };
    });
  }),
});
