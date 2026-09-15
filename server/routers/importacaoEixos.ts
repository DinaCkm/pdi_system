import { createHash } from "crypto";
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { adminProcedure, router } from "../_core/customTrpc";
import { getDb } from "../db";

const identificacaoSchema = z.object({
  linha: z.number().int().positive(),
  nome: z.string().trim().max(255).optional().nullable(),
  email: z.string().trim().max(320).optional().nullable(),
  cpf: z.string().trim().max(30).optional().nullable(),
  unidade: z.string().trim().max(255).optional().nullable(),
});

const linhaTecnicaSchema = identificacaoSchema.extend({
  eixoId: z.string().trim().max(40).optional().nullable(),
  eixoNome: z.string().trim().min(1).max(255),
  relacao: z.enum(["ESSENCIAL", "TRANSVERSAL", "NAO_APLICAVEL", "PENDENTE"]),
  pontuacao: z.number().min(0).max(100).nullable(),
  justificativa: z.string().trim().max(5000).optional().nullable(),
  fonte: z.string().trim().max(5000).optional().nullable(),
  observacao: z.string().trim().max(5000).optional().nullable(),
});

const linhaComportamentalSchema = identificacaoSchema.extend({
  eixoNome: z.string().trim().min(1).max(255),
  pontuacao: z.number().finite(),
  escalaMin: z.number().finite(),
  escalaMax: z.number().finite(),
  classificacao: z.string().trim().max(255).optional().nullable(),
  observacao: z.string().trim().max(5000).optional().nullable(),
});

type LinhaTecnica = z.infer<typeof linhaTecnicaSchema>;
type LinhaComportamental = z.infer<typeof linhaComportamentalSchema>;
type UsuarioImportacao = { id: number; nome: string; email: string | null; cpf: string | null; unidade: string | null };
type ErroImportacao = { linha: number; campo: string; mensagem: string };
type AvisoImportacao = { linha: number; mensagem: string };

function rowsOf<T>(result: any): T[] {
  if (Array.isArray(result?.[0])) return result[0] as T[];
  if (Array.isArray(result)) return result as T[];
  return [];
}

function normalizarTexto(valor: unknown) {
  return String(valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizarCpf(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "");
}

function idEixoPorNome(nome: string) {
  return `EIXO_${createHash("sha256").update(normalizarTexto(nome)).digest("hex").slice(0, 24)}`;
}

async function ensureMatrizTables() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS prova_utic_matrizes (
    id INT AUTO_INCREMENT PRIMARY KEY, colaborador_id INT NOT NULL,
    status ENUM('VALIDADA_PROVISORIA','VALIDADA_DEFINITIVA','PENDENTE_HISTORICO') NOT NULL,
    fonte TEXT NULL, observacao TEXT NULL, atualizado_por INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prova_utic_matriz_colaborador (colaborador_id),
    INDEX idx_prova_utic_matrizes_status (status),
    CONSTRAINT fk_prova_utic_matrizes_colaborador FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_prova_utic_matrizes_atualizado_por FOREIGN KEY (atualizado_por) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS prova_utic_matriz_eixos (
    id INT AUTO_INCREMENT PRIMARY KEY, matriz_id INT NOT NULL, eixo_id VARCHAR(40) NOT NULL,
    eixo_nome VARCHAR(255) NOT NULL,
    relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_APLICAVEL','PENDENTE') NOT NULL,
    percentual_anterior DECIMAL(5,2) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_prova_utic_matriz_eixo (matriz_id, eixo_id),
    CONSTRAINT fk_prova_utic_matriz_eixos_matriz FOREIGN KEY (matriz_id) REFERENCES prova_utic_matrizes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`));
  await db.execute(sql.raw(`CREATE TABLE IF NOT EXISTS prova_utic_matriz_historico (
    id INT AUTO_INCREMENT PRIMARY KEY, matriz_id INT NOT NULL, eixo_id VARCHAR(40) NULL,
    valor_anterior TEXT NULL, valor_novo TEXT NOT NULL, motivo VARCHAR(255) NOT NULL,
    observacao TEXT NULL, alterado_por INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_prova_utic_matriz_historico_matriz (matriz_id),
    CONSTRAINT fk_prova_utic_matriz_historico_matriz FOREIGN KEY (matriz_id) REFERENCES prova_utic_matrizes(id) ON DELETE CASCADE,
    CONSTRAINT fk_prova_utic_matriz_historico_usuario FOREIGN KEY (alterado_por) REFERENCES users(id) ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`));

  const colunaResult = await db.execute(sql`SELECT COLUMN_TYPE AS columnType FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prova_utic_matriz_eixos' AND COLUMN_NAME = 'relacao' LIMIT 1`);
  const coluna = rowsOf<any>(colunaResult)[0];
  if (coluna && !String(coluna.columnType ?? "").includes("'PENDENTE'")) {
    await db.execute(sql.raw("ALTER TABLE prova_utic_matriz_eixos MODIFY COLUMN relacao ENUM('ESSENCIAL','TRANSVERSAL','NAO_APLICAVEL','PENDENTE') NOT NULL"));
  }
  return db;
}

async function carregarUsuarios(db: any): Promise<UsuarioImportacao[]> {
  const result = await db.execute(sql`SELECT u.id, u.name AS nome, u.email, u.cpf, d.nome AS unidade
    FROM users u LEFT JOIN departamentos d ON d.id = u.departamentoId WHERE u.status = 'ativo'`);
  return rowsOf<any>(result).map(item => ({
    id: Number(item.id), nome: String(item.nome ?? ""), email: item.email ? String(item.email) : null,
    cpf: item.cpf ? String(item.cpf) : null, unidade: item.unidade ? String(item.unidade) : null,
  }));
}

function localizarUsuario(linha: Pick<LinhaTecnica, "nome" | "email" | "cpf" | "linha">, usuarios: UsuarioImportacao[]) {
  const email = normalizarTexto(linha.email);
  const cpf = normalizarCpf(linha.cpf);
  const nome = normalizarTexto(linha.nome);
  let encontrados: UsuarioImportacao[] = [];
  if (email) encontrados = usuarios.filter(item => normalizarTexto(item.email) === email);
  else if (cpf) encontrados = usuarios.filter(item => normalizarCpf(item.cpf) === cpf);
  else if (nome) encontrados = usuarios.filter(item => normalizarTexto(item.nome) === nome);
  else return { usuario: null, erro: { linha: linha.linha, campo: "Empregado", mensagem: "Informe nome, e-mail ou CPF." } as ErroImportacao };
  if (encontrados.length === 0) return { usuario: null, erro: { linha: linha.linha, campo: "Empregado", mensagem: "Empregado ativo não localizado no sistema." } as ErroImportacao };
  if (encontrados.length > 1) return { usuario: null, erro: { linha: linha.linha, campo: "Empregado", mensagem: "Há mais de um cadastro compatível. Use e-mail ou CPF." } as ErroImportacao };
  return { usuario: encontrados[0], erro: null };
}

function validarTecnicas(linhas: LinhaTecnica[], usuarios: UsuarioImportacao[]) {
  const erros: ErroImportacao[] = [];
  const avisos: AvisoImportacao[] = [];
  const resolvidas: Array<LinhaTecnica & { usuario: UsuarioImportacao }> = [];
  const chaves = new Set<string>();
  for (const linha of linhas) {
    const localizado = localizarUsuario(linha, usuarios);
    if (localizado.erro || !localizado.usuario) { erros.push(localizado.erro!); continue; }
    const usuario = localizado.usuario;
    const chave = `${usuario.id}:${normalizarTexto(linha.eixoNome)}`;
    if (chaves.has(chave)) { erros.push({ linha: linha.linha, campo: "Eixo", mensagem: "O mesmo eixo aparece mais de uma vez para este empregado." }); continue; }
    chaves.add(chave);
    if (linha.unidade && usuario.unidade && normalizarTexto(linha.unidade) !== normalizarTexto(usuario.unidade)) {
      avisos.push({ linha: linha.linha, mensagem: `Unidade do arquivo: ${linha.unidade}. Cadastro atual preservado: ${usuario.unidade}.` });
    }
    resolvidas.push({ ...linha, usuario });
  }
  return { erros, avisos, resolvidas };
}

async function validarComportamentais(db: any, avaliacaoId: number, linhas: LinhaComportamental[], usuarios: UsuarioImportacao[]) {
  const erros: ErroImportacao[] = [];
  const avisos: AvisoImportacao[] = [];
  const avaliacaoResult = await db.execute(sql`SELECT id, tipo, status, titulo FROM avaliacoes WHERE id = ${avaliacaoId} LIMIT 1`);
  const avaliacao = rowsOf<any>(avaliacaoResult)[0];
  if (!avaliacao) erros.push({ linha: 1, campo: "Avaliação", mensagem: "Avaliação não encontrada." });
  else if (avaliacao.tipo !== "DESEMPENHO") erros.push({ linha: 1, campo: "Avaliação", mensagem: "Selecione uma Avaliação de Desempenho." });
  else if (!["RASCUNHO", "EM_CONFERENCIA"].includes(avaliacao.status)) erros.push({ linha: 1, campo: "Avaliação", mensagem: "A avaliação selecionada não aceita novas medições." });

  const competenciasResult = await db.execute(sql`SELECT id, nome FROM competencias_macros WHERE ativo = 1`);
  const porNome = new Map<string, Array<{ id: number; nome: string }>>();
  for (const item of rowsOf<any>(competenciasResult)) {
    const competencia = { id: Number(item.id), nome: String(item.nome) };
    const chave = normalizarTexto(competencia.nome);
    porNome.set(chave, [...(porNome.get(chave) ?? []), competencia]);
  }
  const resolvidas: Array<LinhaComportamental & { usuario: UsuarioImportacao; competencia: { id: number; nome: string } }> = [];
  const chaves = new Set<string>();
  for (const linha of linhas) {
    const localizado = localizarUsuario(linha, usuarios);
    if (localizado.erro || !localizado.usuario) { erros.push(localizado.erro!); continue; }
    if (linha.escalaMax <= linha.escalaMin) { erros.push({ linha: linha.linha, campo: "Escala", mensagem: "A escala máxima deve ser maior que a mínima." }); continue; }
    if (linha.pontuacao < linha.escalaMin || linha.pontuacao > linha.escalaMax) { erros.push({ linha: linha.linha, campo: "Pontuação", mensagem: "A pontuação está fora da escala." }); continue; }
    const opcoes = porNome.get(normalizarTexto(linha.eixoNome)) ?? [];
    if (opcoes.length === 0) { erros.push({ linha: linha.linha, campo: "Eixo", mensagem: "Eixo não localizado no cadastro de Competências." }); continue; }
    if (opcoes.length > 1) { erros.push({ linha: linha.linha, campo: "Eixo", mensagem: "Há mais de uma competência com este nome." }); continue; }
    const chave = `${localizado.usuario.id}:${opcoes[0].id}`;
    if (chaves.has(chave)) { erros.push({ linha: linha.linha, campo: "Eixo", mensagem: "O mesmo eixo aparece mais de uma vez para este empregado." }); continue; }
    chaves.add(chave);
    if (linha.unidade && localizado.usuario.unidade && normalizarTexto(linha.unidade) !== normalizarTexto(localizado.usuario.unidade)) {
      avisos.push({ linha: linha.linha, mensagem: `A unidade difere do cadastro atual (${localizado.usuario.unidade}), que será preservado.` });
    }
    resolvidas.push({ ...linha, usuario: localizado.usuario, competencia: opcoes[0] });
  }
  return { avaliacao, erros, avisos, resolvidas };
}

export const importacaoEixosRouter = router({
  validarTecnicos: adminProcedure.input(z.object({ linhas: z.array(linhaTecnicaSchema).min(1).max(10000) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const resultado = validarTecnicas(input.linhas, await carregarUsuarios(db));
    return { valido: resultado.erros.length === 0, totalLinhas: input.linhas.length,
      totalEmpregados: new Set(resultado.resolvidas.map(item => item.usuario.id)).size, totalEixos: resultado.resolvidas.length,
      pendentesClassificacao: resultado.resolvidas.filter(item => item.relacao === "PENDENTE").length,
      pendentesPontuacao: resultado.resolvidas.filter(item => item.pontuacao === null).length,
      erros: resultado.erros, avisos: resultado.avisos };
  }),

  importarTecnicos: adminProcedure.input(z.object({
    linhas: z.array(linhaTecnicaSchema).min(1).max(10000), arquivoNome: z.string().trim().min(1).max(255),
    substituirExistentes: z.boolean().default(false), confirmado: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    const db = await ensureMatrizTables();
    const validacao = validarTecnicas(input.linhas, await carregarUsuarios(db));
    if (validacao.erros.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Importação cancelada: ${validacao.erros.length} erro(s).` });
    let criados = 0, atualizados = 0, ignorados = 0;
    await db.transaction(async (tx: any) => {
      const grupos = new Map<number, typeof validacao.resolvidas>();
      for (const linha of validacao.resolvidas) grupos.set(linha.usuario.id, [...(grupos.get(linha.usuario.id) ?? []), linha]);
      for (const [usuarioId, linhas] of Array.from(grupos.entries())) {
        const temPendencia = linhas.some((item: LinhaTecnica & { usuario: UsuarioImportacao }) => item.relacao === "PENDENTE" || item.pontuacao === null);
        await tx.execute(sql`INSERT INTO prova_utic_matrizes (colaborador_id, status, fonte, observacao, atualizado_por)
          VALUES (${usuarioId}, ${temPendencia ? "PENDENTE_HISTORICO" : "VALIDADA_PROVISORIA"}, ${`Importação: ${input.arquivoNome}`},
          'Importação administrativa pré-validada; correções posteriores disponíveis na administração de eixos.', ${ctx.user.id})
          ON DUPLICATE KEY UPDATE atualizado_por = VALUES(atualizado_por), updated_at = NOW()`);
        const matrizResult = await tx.execute(sql`SELECT id FROM prova_utic_matrizes WHERE colaborador_id = ${usuarioId} LIMIT 1`);
        const matriz = rowsOf<{ id: number }>(matrizResult)[0];
        if (!matriz) throw new Error("Não foi possível preparar a matriz do empregado.");
        const existentesResult = await tx.execute(sql`SELECT eixo_id AS eixoId, eixo_nome AS eixoNome, relacao, percentual_anterior AS pontuacao FROM prova_utic_matriz_eixos WHERE matriz_id = ${matriz.id}`);
        const existentes = rowsOf<any>(existentesResult);
        for (const linha of linhas) {
          const existente = existentes.find(item => (linha.eixoId && item.eixoId === linha.eixoId) || normalizarTexto(item.eixoNome) === normalizarTexto(linha.eixoNome));
          if (existente && !input.substituirExistentes) { ignorados++; continue; }
          const eixoId = existente?.eixoId || linha.eixoId || idEixoPorNome(linha.eixoNome);
          const valorNovo = { eixo: linha.eixoNome, relacao: linha.relacao, anterior: linha.pontuacao };
          if (existente) {
            await tx.execute(sql`UPDATE prova_utic_matriz_eixos SET eixo_nome = ${linha.eixoNome}, relacao = ${linha.relacao}, percentual_anterior = ${linha.pontuacao}, updated_at = NOW() WHERE matriz_id = ${matriz.id} AND eixo_id = ${eixoId}`);
            atualizados++;
          } else {
            await tx.execute(sql`INSERT INTO prova_utic_matriz_eixos (matriz_id, eixo_id, eixo_nome, relacao, percentual_anterior) VALUES (${matriz.id}, ${eixoId}, ${linha.eixoNome}, ${linha.relacao}, ${linha.pontuacao})`);
            criados++;
          }
          const detalhes = [linha.justificativa, linha.observacao, linha.fonte].filter(Boolean).join("\n\n") || null;
          await tx.execute(sql`INSERT INTO prova_utic_matriz_historico (matriz_id, eixo_id, valor_anterior, valor_novo, motivo, observacao, alterado_por)
            VALUES (${matriz.id}, ${eixoId}, ${existente ? JSON.stringify(existente) : null}, ${JSON.stringify(valorNovo)}, 'Importação administrativa de eixos técnicos', ${detalhes}, ${ctx.user.id})`);
        }
      }
    });
    return { sucesso: true, criados, atualizados, ignorados, total: input.linhas.length };
  }),

  validarComportamentais: adminProcedure.input(z.object({ avaliacaoId: z.number().int().positive(), linhas: z.array(linhaComportamentalSchema).min(1).max(10000) })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const resultado = await validarComportamentais(db, input.avaliacaoId, input.linhas, await carregarUsuarios(db));
    return { valido: resultado.erros.length === 0, avaliacaoTitulo: resultado.avaliacao?.titulo ?? null,
      totalLinhas: input.linhas.length, totalEmpregados: new Set(resultado.resolvidas.map(item => item.usuario.id)).size,
      totalEixos: resultado.resolvidas.length, erros: resultado.erros, avisos: resultado.avisos };
  }),

  importarComportamentais: adminProcedure.input(z.object({
    avaliacaoId: z.number().int().positive(), linhas: z.array(linhaComportamentalSchema).min(1).max(10000),
    arquivoNome: z.string().trim().min(1).max(255), confirmado: z.literal(true),
  })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
    const validacao = await validarComportamentais(db, input.avaliacaoId, input.linhas, await carregarUsuarios(db));
    if (validacao.erros.length) throw new TRPCError({ code: "BAD_REQUEST", message: `Importação cancelada: ${validacao.erros.length} erro(s).` });
    let criados = 0, ignorados = 0;
    await db.transaction(async (tx: any) => {
      for (const linha of validacao.resolvidas) {
        const existenteResult = await tx.execute(sql`SELECT id FROM medicoes_competencias WHERE avaliacaoId = ${input.avaliacaoId} AND colaboradorId = ${linha.usuario.id} AND competenciaMacroId = ${linha.competencia.id} LIMIT 1`);
        if (rowsOf<any>(existenteResult).length) { ignorados++; continue; }
        await tx.execute(sql`INSERT INTO medicoes_competencias (avaliacaoId, colaboradorId, competenciaMacroId, tipoCompetencia, fonte, valor, escala_min, escala_max, classificacao, observacao, validada, validada_por, validada_em)
          VALUES (${input.avaliacaoId}, ${linha.usuario.id}, ${linha.competencia.id}, 'COMPORTAMENTAL', 'AVALIACAO_DESEMPENHO', ${linha.pontuacao}, ${linha.escalaMin}, ${linha.escalaMax}, ${linha.classificacao ?? null}, ${linha.observacao ?? null}, 0, NULL, NULL)`);
        criados++;
      }
      await tx.execute(sql`UPDATE avaliacoes SET origem = 'IMPORTACAO', arquivo_origem_nome = ${input.arquivoNome}, status = IF(status = 'RASCUNHO', 'EM_CONFERENCIA', status), updatedAt = NOW() WHERE id = ${input.avaliacaoId}`);
    });
    return { sucesso: true, criados, ignorados, total: input.linhas.length, importadoPor: ctx.user.name };
  }),
});
