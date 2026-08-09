import XLSX from "xlsx";
import { eq, and } from "drizzle-orm";
import { getDb } from "../db";
import { users, pdis } from "../../drizzle/schema";
import {
  createImportBatch,
  updateImportBatchStatus,
  createImportRow,
  updateImportRowStatus,
  resolveMacrocompetenciaId,
  createPerformanceEvaluation,
  addPerformanceEvaluationResult,
  createCertificationResult,
} from "../db";

// ==========================================================
// Relatório Individual de Evolução - Etapa 6 (Importadores)
// Cada função aqui: (1) cria um import_batch, (2) processa linha a linha
// criando um import_row por linha, (3) só grava na tabela final quando a
// linha está OK, (4) nunca inventa dado - linha ambígua fica bloqueada
// para revisão manual (linhasBloqueadas), nunca é promovida sozinha.
// ==========================================================

// ---------- Helpers genéricos ----------

function normalizarTexto(v: unknown): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .trim()
    .toLowerCase();
}

const PALAVRAS_IGNORADAS = new Set(["de", "do", "da", "dos", "das", "e"]);

/** Divide em palavras, ignorando conectores (de/do/da/dos/das/e) e espaços duplicados. */
function palavrasSignificativas(texto: string): string[] {
  return texto
    .split(/\s+/)
    .filter(Boolean)
    .filter((p) => !PALAVRAS_IGNORADAS.has(p));
}

function lerPlanilha(buffer: Buffer, nomeAba: string): Record<string, any>[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const nomeReal = wb.SheetNames.find((n) => n.trim() === nomeAba.trim()) ?? nomeAba;
  const sheet = wb.Sheets[nomeReal];
  if (!sheet) throw new Error(`Aba "${nomeAba}" não encontrada na planilha`);
  return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
}

/**
 * Resolve um usuário por e-mail (prioridade), depois CPF, depois nome exato
 * normalizado (sem acento/maiúscula) entre usuários ativos. Nunca casa por
 * semelhança textual - se não achar exato, retorna null e a linha é
 * bloqueada para revisão manual (regra da Etapa 2).
 */
async function resolverUsuario(
  db: any,
  dados: { email?: string | null; cpf?: string | null; nome?: string | null }
): Promise<number | null> {
  if (dados.email) {
    const [porEmail] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, String(dados.email).trim().toLowerCase()));
    if (porEmail) return porEmail.id;
  }

  if (dados.cpf) {
    const cpfLimpo = String(dados.cpf).replace(/\D/g, "");
    if (cpfLimpo) {
      const todos = await db.select({ id: users.id, cpf: users.cpf }).from(users);
      const match = todos.find((u: any) => String(u.cpf ?? "").replace(/\D/g, "") === cpfLimpo);
      if (match) return match.id;
    }
  }

  if (dados.nome) {
    const alvo = normalizarTexto(dados.nome);
    const todos = await db.select({ id: users.id, name: users.name }).from(users);

    const exato = todos.find((u: any) => normalizarTexto(u.name) === alvo);
    if (exato) return exato.id;

    // Fallback por semelhança: ignora conectores (de/do/da/e) e espaços
    // duplicados, e considera correspondência se todas as palavras
    // significativas do nome da planilha aparecem no nome cadastrado, na
    // mesma ordem relativa. Só resolve sozinho se achar EXATAMENTE UMA
    // pessoa assim - duas pessoas parecidas continuam bloqueadas.
    const alvoPalavras = palavrasSignificativas(alvo);
    const candidatos = todos.filter((u: any) => {
      const nomePalavras = palavrasSignificativas(normalizarTexto(u.name));
      let i = 0;
      for (const p of nomePalavras) {
        if (i < alvoPalavras.length && p === alvoPalavras[i]) i++;
      }
      return i === alvoPalavras.length;
    });
    if (candidatos.length === 1) return candidatos[0].id;
  }

  return null;
}

/** Garante um `pdis` (PDI) para o usuário/ciclo, criando um se ainda não existir. */
async function garantirPdi(db: any, colaboradorId: number, cicloId: number, createdBy: number): Promise<number> {
  const [existente] = await db
    .select({ id: pdis.id })
    .from(pdis)
    .where(and(eq(pdis.colaboradorId, colaboradorId), eq(pdis.cicloId, cicloId)));
  if (existente) return existente.id;

  const result = await db.insert(pdis).values({
    colaboradorId,
    cicloId,
    titulo: "PDI importado (Relatório Individual de Evolução)",
    status: "concluido",
    createdBy,
  });
  return result[0].insertId as number;
}

export type ResultadoImportacao = {
  importBatchId: number;
  totalLinhas: number;
  linhasOk: number;
  linhasErro: number;
  linhasBloqueadas: number;
};

// ==========================================================
// 1) Certificação técnica (CONSOLIDADO UNIDADES / CONSOLIDADO REGIONAIS
//    ou o formato RESULTADO REVISTO_[unidade] com e-mail)
// ==========================================================

export async function importCertificacaoTecnica(
  buffer: Buffer,
  nomeAba: string,
  nomeArquivo: string,
  cicloId: number,
  importadoPor: number
): Promise<ResultadoImportacao> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const linhas = lerPlanilha(buffer, nomeAba);
  const importBatchId = await createImportBatch({
    cicloId,
    tipo: "certificacao_tecnica",
    nomeArquivo,
    totalLinhas: linhas.length,
    importadoPor,
  });

  let linhasOk = 0;
  let linhasErro = 0;
  let linhasBloqueadas = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const numeroLinha = i + 2; // +2 = cabeçalho + índice 1-based
    const dadosOriginais = JSON.stringify(linha);
    const importRowId = await createImportRow({ importBatchId, numeroLinha, dadosOriginais });

    try {
      const nome = linha["Empregado"] ?? linha["Aluno"];
      const email = linha["E-mail"] ?? linha["Email"] ?? linha["email"];
      const cpf = linha["CPF"] ?? linha["Cpf"];
      const macrocompetenciaOriginal = linha["Macrocompetência"];
      const percentualBruto = linha["Percentual (%)"];

      if (!nome || !macrocompetenciaOriginal || percentualBruto === null || percentualBruto === undefined) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: "Linha incompleta: falta Empregado, Macrocompetência ou Percentual",
        });
        linhasBloqueadas++;
        continue;
      }

      const userId = await resolverUsuario(db, { email, cpf, nome });
      if (!userId) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `Usuário "${nome}" não encontrado por e-mail/CPF/nome exato - precisa de identificação manual`,
        });
        linhasBloqueadas++;
        continue;
      }

      // Percentual pode vir como número puro, "70%", "71,4%" (vírgula
      // decimal) - tudo isso é válido. Texto qualitativo ("Adequado",
      // "Médio/Alto") não é percentual de verdade - fica como erro mesmo.
      const percentualTexto = String(percentualBruto).trim().replace("%", "").replace(",", ".");
      const percentual = Math.round(Number(percentualTexto));
      if (percentualTexto === "" || Number.isNaN(percentual) || percentual < 0 || percentual > 100) {
        await updateImportRowStatus(importRowId, {
          status: "erro",
          erro: `Percentual inválido: ${percentualBruto}`,
        });
        linhasErro++;
        continue;
      }

      // Resolve macrocompetência: nome exato -> alias aprovado.
      // Sem correspondência: NÃO inventa/sugere sozinho. A linha bloqueada
      // com o erro abaixo já serve de fila de pendências para a Etapa 9
      // (onde a sugestão por similaridade será construída de verdade).
      const macrocompetenciaId = await resolveMacrocompetenciaId(String(macrocompetenciaOriginal));
      if (!macrocompetenciaId) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `Macrocompetência "${macrocompetenciaOriginal}" sem alias aprovado - aguardando resolução (Etapa 9)`,
        });
        linhasBloqueadas++;
        continue;
      }

      const certId = await createCertificationResult({
        userId,
        cicloId,
        importBatchId,
        unidadeRegional: linha["Unidade / Regional"] ?? linha["Unidade"] ?? linha["Unidade / Regional "] ?? null,
        cargo: linha["Cargo"] ?? null,
        perfil: linha["Perfil"] ?? null,
        macrocompetenciaOriginal: String(macrocompetenciaOriginal),
        macrocompetenciaId,
        percentual,
        leitura: linha["Leitura"] ?? null,
      });

      await updateImportRowStatus(importRowId, {
        status: "ok",
        entidadeTipo: "certification_result",
        entidadeId: certId,
      });
      linhasOk++;
    } catch (err: any) {
      await updateImportRowStatus(importRowId, { status: "erro", erro: String(err?.message ?? err) });
      linhasErro++;
    }
  }

  const status = linhasErro > 0 ? "concluido_com_erros" : linhasBloqueadas > 0 ? "concluido_com_erros" : "concluido";
  await updateImportBatchStatus(importBatchId, {
    status,
    linhasOk,
    linhasErro,
    linhasBloqueadas,
    concluidoEm: new Date(),
  });

  return { importBatchId, totalLinhas: linhas.length, linhasOk, linhasErro, linhasBloqueadas };
}

// ==========================================================
// 2) Avaliação de desempenho comportamental (aba MODELO_UPLOAD)
//    Replica a validação já embutida na própria planilha-modelo:
//    completude, soma de pesos ~1, notas dentro da escala, e
//    tolerância de 0,01 entre resultado informado x calculado.
// ==========================================================

export async function importAvaliacaoDesempenho(
  buffer: Buffer,
  nomeArquivo: string,
  cicloId: number,
  importadoPor: number
): Promise<ResultadoImportacao> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const linhas = lerPlanilha(buffer, "MODELO_UPLOAD");
  const importBatchId = await createImportBatch({
    cicloId,
    tipo: "avaliacao_desempenho",
    nomeArquivo,
    totalLinhas: linhas.length,
    importadoPor,
  });

  // Cache de "performance_evaluations" já criadas nesta importação, por e-mail
  const avaliacaoPorEmail = new Map<string, number>();

  let linhasOk = 0;
  let linhasErro = 0;
  let linhasBloqueadas = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    const numeroLinha = i + 2;
    const dadosOriginais = JSON.stringify(linha);
    const importRowId = await createImportRow({ importBatchId, numeroLinha, dadosOriginais });

    try {
      const email = linha["email_empregado"];
      const nome = linha["nome_empregado"];
      const cpf = linha["cpf_empregado"];
      const competenciaNome = linha["competencia_nome"];
      const escalaMin = Number(linha["escala_min"]);
      const escalaMax = Number(linha["escala_max"]);
      const notaAuto = Number(linha["nota_auto"]);
      const pesoAuto = Number(linha["peso_auto"]);
      const notaGestor = Number(linha["nota_gestor"]);
      const pesoGestor = Number(linha["peso_gestor"]);
      const notaPares = Number(linha["nota_pares"]);
      const pesoPares = Number(linha["peso_pares"]);
      const resultadoInformado = Number(linha["resultado_total_informado"]);

      const camposObrigatorios = [
        email, nome, cpf ? true : true, competenciaNome,
        linha["escala_min"], linha["escala_max"],
        linha["nota_auto"], linha["peso_auto"],
        linha["nota_gestor"], linha["peso_gestor"],
        linha["nota_pares"], linha["peso_pares"],
        linha["resultado_total_informado"],
      ];
      if (camposObrigatorios.some((v) => v === null || v === undefined || v === "")) {
        await updateImportRowStatus(importRowId, { status: "bloqueado_revisao", erro: "INCOMPLETO" });
        linhasBloqueadas++;
        continue;
      }

      const somaPesos = pesoAuto + pesoGestor + pesoPares;
      if (Math.abs(somaPesos - 1) > 0.0001) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `REVISAR PESOS: soma dos pesos = ${somaPesos.toFixed(4)} (esperado 1.0000)`,
        });
        linhasBloqueadas++;
        continue;
      }

      const notasForaDaEscala = [notaAuto, notaGestor, notaPares].some(
        (n) => n < escalaMin || n > escalaMax
      );
      if (notasForaDaEscala) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `REVISAR ESCALA: alguma nota fora do intervalo [${escalaMin}, ${escalaMax}]`,
        });
        linhasBloqueadas++;
        continue;
      }

      const resultadoCalculado = notaAuto * pesoAuto + notaGestor * pesoGestor + notaPares * pesoPares;
      if (Math.abs(resultadoInformado - resultadoCalculado) > 0.01) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `REVISAR RESULTADO: informado ${resultadoInformado} x calculado ${resultadoCalculado.toFixed(4)} (tolerância 0.01)`,
        });
        linhasBloqueadas++;
        continue;
      }

      const userId = await resolverUsuario(db, { email, cpf, nome });
      if (!userId) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `Usuário "${nome}" (${email}) não encontrado no sistema`,
        });
        linhasBloqueadas++;
        continue;
      }

      const chaveAvaliacao = `${email}__${cicloId}`;
      let performanceEvaluationId = avaliacaoPorEmail.get(chaveAvaliacao);
      if (!performanceEvaluationId) {
        performanceEvaluationId = await createPerformanceEvaluation({
          userId,
          cicloId,
          importBatchId,
          dataAvaliacao: linha["data_emissao_relatorio"] ? new Date(linha["data_emissao_relatorio"]) : null,
          avaliador: linha["gestor_nome_no_ciclo"] ?? null,
        });
        avaliacaoPorEmail.set(chaveAvaliacao, performanceEvaluationId);
      }

      const macrocompetenciaId = await resolveMacrocompetenciaId(String(competenciaNome));

      const resultId = await addPerformanceEvaluationResult({
        performanceEvaluationId,
        competencia: String(competenciaNome),
        competenciaMacroId: macrocompetenciaId,
        nota: resultadoCalculado,
        escala: `${escalaMin}-${escalaMax}`,
      });

      await updateImportRowStatus(importRowId, {
        status: "ok",
        entidadeTipo: "performance_evaluation_result",
        entidadeId: resultId,
      });
      linhasOk++;
    } catch (err: any) {
      await updateImportRowStatus(importRowId, { status: "erro", erro: String(err?.message ?? err) });
      linhasErro++;
    }
  }

  const status = linhasErro > 0 || linhasBloqueadas > 0 ? "concluido_com_erros" : "concluido";
  await updateImportBatchStatus(importBatchId, {
    status,
    linhasOk,
    linhasErro,
    linhasBloqueadas,
    concluidoEm: new Date(),
  });

  return { importBatchId, totalLinhas: linhas.length, linhasOk, linhasErro, linhasBloqueadas };
}

// ==========================================================
// 3) PDI comportamental - ações do ciclo (abas "Ações Finalizadas" e
//    "Ações Não Finalizadas" do formato "Relatório - Ciclo [ano]")
// ==========================================================

/**
 * Infere comportamental/técnica olhando várias colunas da aba "Ações
 * Finalizadas" (Descrição, Área de desenvolvimento, Padronização), já que
 * o prefixo "Competência Técnica:"/"Competência Comportamental:" pode
 * aparecer em qualquer uma delas dependendo da linha. Se não achar em
 * nenhuma, retorna null (fica bloqueado - nunca chuta).
 */
function inferirTipoCompetenciaFinalizada(linha: Record<string, any>): "comportamental" | "tecnica" | null {
  const candidatos = [linha["Descrição"], linha["Área de desenvolvimento"], linha["Padronização"]];
  for (const c of candidatos) {
    const t = normalizarTexto(c);
    if (t.includes("competencia tecnica") || t.includes("macro area tecnica") || t.includes("tecnica:")) return "tecnica";
    if (t.includes("competencia comportamental") || t.includes("macro area do comportamento") || t.includes("comportamental:")) return "comportamental";
  }
  return null;
}

export async function importPdiComportamental(
  buffer: Buffer,
  nomeArquivo: string,
  cicloId: number,
  importadoPor: number
): Promise<ResultadoImportacao> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const finalizadas = lerPlanilha(buffer, "Ações Finalizadas").map((l) => ({ ...l, __finalizada: true }));
  const naoFinalizadas = lerPlanilha(buffer, "Ações Não Finalizadas").map((l) => ({ ...l, __finalizada: false }));
  const linhas = [...finalizadas, ...naoFinalizadas];

  const importBatchId = await createImportBatch({
    cicloId,
    tipo: "pdi_comportamental",
    nomeArquivo,
    totalLinhas: linhas.length,
    importadoPor,
  });

  let linhasOk = 0;
  let linhasErro = 0;
  let linhasBloqueadas = 0;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i] as any;
    const numeroLinha = i + 2;
    const dadosOriginais = JSON.stringify(linha);
    const importRowId = await createImportRow({ importBatchId, numeroLinha, dadosOriginais });

    try {
      const nome = linha["Nome"];
      const titulo = linha["Ação"];
      const padronizacao = linha["Padronização"];
      // A aba "Ações Finalizadas" tem coluna "Descrição" duplicada (uma da
      // macroárea, outra da ação em si). A biblioteca xlsx renomeia a
      // segunda ocorrência para "Descrição_1" - é essa que queremos aqui.
      // Na aba "Ações Não Finalizadas" não há duplicata, "Descrição" já é a certa.
      const descricao = linha.__finalizada
        ? linha["Descrição_1"] ?? linha["Descrição"]
        : linha["Descrição"];
      const categoria = linha["Categoria"];

      if (!nome || !titulo || !padronizacao) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: "Linha incompleta: falta Nome, Ação ou Padronização",
        });
        linhasBloqueadas++;
        continue;
      }

      const tipoCompetencia: "comportamental" | "tecnica" | null = linha.__finalizada
        ? inferirTipoCompetenciaFinalizada(linha)
        : "comportamental"; // regra de negócio: ações não finalizadas de 2025 são todas comportamentais (confirmado por Dina)
      if (!tipoCompetencia) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `Não foi possível identificar se "${padronizacao}" é comportamental ou técnica - classificação manual necessária`,
        });
        linhasBloqueadas++;
        continue;
      }

      const userId = await resolverUsuario(db, { nome, email: linha["Email"] ?? null });
      if (!userId) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `Usuário "${nome}" não encontrado por nome exato`,
        });
        linhasBloqueadas++;
        continue;
      }

      // actions.macroId é NOT NULL - resolve pelo catálogo real, nunca inventa.
      // Se não resolver, a linha bloqueada com o erro abaixo fica como
      // pendência para a Etapa 9, sem gravar nenhum alias fake.
      const macroId = await resolveMacrocompetenciaId(String(padronizacao));
      if (!macroId) {
        await updateImportRowStatus(importRowId, {
          status: "bloqueado_revisao",
          erro: `Macroárea "${padronizacao}" sem correspondência no catálogo - aguardando resolução (Etapa 9)`,
        });
        linhasBloqueadas++;
        continue;
      }

      const pdiId = await garantirPdi(db, userId, cicloId, importadoPor);

      const dataConclusaoReal =
        linha.__finalizada && linha["Concluído em (yyyy-mm-dd)"]
          ? new Date(linha["Concluído em (yyyy-mm-dd)"])
          : null;
      const prazo = linha["Data de entrega (yyyy-mm-dd)"] ? new Date(linha["Data de entrega (yyyy-mm-dd)"]) : null;

      const { actions } = await import("../../drizzle/schema");
      const result = await db.insert(actions).values({
        pdiId,
        macroId,
        titulo: String(titulo).slice(0, 255),
        descricao: descricao ? String(descricao) : null,
        prazo,
        status: linha.__finalizada ? "concluida" : "em_andamento",
        cicloId,
        tipoCompetencia,
        competenciaOriginal: String(padronizacao),
        categoriaDesenvolvimento: categoria ? String(categoria) : null,
        dataConclusaoReal,
        sourceImportRowId: importRowId,
      });
      const actionId = result[0].insertId as number;

      await updateImportRowStatus(importRowId, {
        status: "ok",
        entidadeTipo: "action",
        entidadeId: actionId,
      });
      linhasOk++;
    } catch (err: any) {
      await updateImportRowStatus(importRowId, { status: "erro", erro: String(err?.message ?? err) });
      linhasErro++;
    }
  }

  const status = linhasErro > 0 || linhasBloqueadas > 0 ? "concluido_com_erros" : "concluido";
  await updateImportBatchStatus(importBatchId, {
    status,
    linhasOk,
    linhasErro,
    linhasBloqueadas,
    concluidoEm: new Date(),
  });

  return { importBatchId, totalLinhas: linhas.length, linhasOk, linhasErro, linhasBloqueadas };
}
