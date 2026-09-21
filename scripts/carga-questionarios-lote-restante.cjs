const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const CSV_PATH = path.resolve(process.cwd(), "data/questionarios_pendentes_respostas_extraidas.csv");
const BATCH_MARKER = "carga-questionarios-lote-restante-2026-09-21";

const PERGUNTAS = [
  ["pdi_criado_ano", "Você já criou um Plano de Desenvolvimento Individual (PDI) para este ano?", 1],
  ["desafios_funcao", "Quais são os maiores desafios que você enfrenta nesta função dentro da sua área ou departamento?", 2],
  ["graduacoes_fundamentais", "Considerando a função que você exerce e o contexto específico da sua área de atuação, quais cursos de graduação você considera fundamentais para quem deseja desempenhar esse papel?", 3],
  ["especializacoes_recomendadas", "Se alguém quisesse se especializar ainda mais na função que você desempenha hoje, que MBAs ou pós-graduações você indicaria?", 4],
  ["cursos_extracurriculares", "Pensando no seu dia a dia e na experiência prática que você tem, quais cursos extracurriculares poderiam apoiar ainda mais o desenvolvimento de quem ocupa a função que você desempenha?", 5],
  ["cursos_internos_sebrae", "Sabendo que o Sebrae oferece uma ampla variedade de cursos internos, quais você acredita que seriam mais importantes para apoiar o desenvolvimento de quem ocupa a função que você exerce hoje?", 6],
  ["temas_competencias_indispensaveis", "Imaginando a construção de um programa de desenvolvimento para a função que você exerce, quais temas ou competências você acredita que não poderiam faltar?", 7],
  ["plano_capacitacao_ano", "Existe algum Plano de Capacitação definido internamente para este ano? Se sim, quais capacitações estão previstas?", 8],
  ["descricao_funcao", "Se alguém de fora perguntasse o que faz uma pessoa que ocupa este cargo dentro da sua área, departamento ou escritório, como você explicaria?", 9],
  ["principais_atividades", "Quais são as 5 principais atividades que fazem parte da sua rotina nesta função e que realmente fazem diferença no dia a dia do setor?", 10],
  ["conhecimentos_habilidades_indispensaveis", "Pensando nas atividades que você realiza hoje no seu dia a dia, quais conhecimentos e habilidades são indispensáveis para desempenhá-las bem?", 11],
  ["responsabilidades_extras", "Existe alguma responsabilidade ou atividade que você realiza e considera importante, mas que não consta oficialmente na descrição do seu cargo?", 12],
  ["cursos_eventos_interesse", "Tem algum curso, congresso, feira ou evento que você tem interesse em participar ou que seu gestor tenha indicado? Explique como isso pode melhorar o desempenho da sua função.", 13],
  ["formacao_academica_relacionada", "Entre as graduações, MBAs ou pós-graduações sugeridas, quais fazem parte da sua formação acadêmica?", 14],
  ["cursos_realizados", "Entre os cursos extracurriculares recomendados, quais já fazem parte da sua trajetória de formação?", 15],
  ["desenvolvimento_futuro", "Pensando no seu crescimento e no impacto positivo para o Sebrae, existem cursos, formações ou eventos que poderiam fortalecer ainda mais suas competências?", 16],
  ["principal_atuacao", "Pode explicar qual é a sua principal atuação atualmente?", 17]
];

function parseCsv(text, sep = ";") {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (field.length || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isReadyStatus(status) {
  return status === "PRONTO_AUTOMATICO" || status === "PRONTO_HISTORICO_LEGADO";
}

function asInt(value) {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) ? n : null;
}

function buildObservation(row) {
  return [
    "marker=" + BATCH_MARKER,
    "unidade=" + (row.unidade || ""),
    "status_origem=" + (row.status_extracao || ""),
    "data_envio=" + (row.data_envio || ""),
    "drive_id=" + (row.drive_id || "")
  ].join("; ");
}

function findUser(users, row) {
  const email = normalizeEmail(row.email);
  if (email) {
    const emailMatches = users.filter((u) => normalizeEmail(u.email) === email);
    if (emailMatches.length === 1) return { user: emailMatches[0], method: "email" };
    if (emailMatches.length > 1) return { user: null, method: "email_ambiguo" };
  }

  const name = normalizeName(row.empregado);
  if (!name) return { user: null, method: "sem_identificador" };
  const nameMatches = users.filter((u) => normalizeName(u.name) === name);
  if (nameMatches.length === 1) return { user: nameMatches[0], method: "nome" };
  if (nameMatches.length > 1) return { user: null, method: "nome_ambiguo" };
  return { user: null, method: "nao_encontrado" };
}

async function rollbackBatch(db, apply) {
  const [rows] = await db.execute(
    "SELECT id, colaborador_id, ano, arquivo_origem_nome FROM questionarios_atividades_funcao WHERE fonte='importado_historico' AND observacoes LIKE ?",
    ["%marker=" + BATCH_MARKER + "%"]
  );
  console.log("[LOTE] ROLLBACK_ENCONTRADOS", rows.length);

  if (!apply) {
    for (const q of rows) {
      console.log("[LOTE] ROLLBACK_SIMULADO", q.id, q.colaborador_id, q.ano, q.arquivo_origem_nome);
    }
    return;
  }

  await db.beginTransaction();
  try {
    for (const q of rows) {
      await db.execute("DELETE FROM questionarios_atividades_funcao WHERE id=?", [q.id]);
      console.log("[LOTE] ROLLBACK_EXCLUIDO", q.id, q.ano, q.arquivo_origem_nome);
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

async function main() {
  const apply = process.argv.includes("--apply");
  const rollback = process.argv.includes("--rollback");

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL não definida.");
  if (!fs.existsSync(CSV_PATH)) throw new Error("CSV não encontrado: " + CSV_PATH);

  const db = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    if (rollback) {
      console.log("[LOTE] MODO", apply ? "ROLLBACK_APPLY" : "ROLLBACK_DRY_RUN");
      await rollbackBatch(db, apply);
      return;
    }

    console.log("[LOTE] MODO", apply ? "APPLY" : "DRY_RUN");

    const csv = fs.readFileSync(CSV_PATH, "utf8");
    const rows = parseCsv(csv);
    if (rows.length < 2) throw new Error("CSV vazio ou sem registros.");

    const headers = rows[0];
    const parsed = rows.slice(1).map((values) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = values[i] == null ? "" : values[i];
      });
      return obj;
    });

    const allowEmails = new Set(
      String(process.env.CARGA_EMAILS || "")
        .split(",")
        .map((v) => normalizeEmail(v))
        .filter(Boolean)
    );

    const readyAll = parsed.filter((r) => isReadyStatus(r.status_extracao));
    const ready = allowEmails.size
      ? readyAll.filter((r) => allowEmails.has(normalizeEmail(r.email)))
      : readyAll;
    const ignored = parsed.filter((r) => !isReadyStatus(r.status_extracao));

    console.log("[LOTE] CSV_TOTAL", parsed.length);
    console.log("[LOTE] PRONTOS", ready.length);
    console.log("[LOTE] FILTRO_EMAILS", allowEmails.size);
    console.log("[LOTE] IGNORADOS_NAO_PRONTOS", ignored.length);

    const [users] = await db.execute("SELECT id,name,email FROM users");

    const stats = {
      criados: 0,
      simulados: 0,
      jaExisteMesmoAno: 0,
      maisRecenteExiste: 0,
      naoEncontrado: 0,
      ambiguo: 0,
      invalido: 0,
      erros: 0
    };

    for (const row of ready) {
      const ano = asInt(row.ano);
      if (!ano) {
        stats.invalido += 1;
        console.log("[LOTE] ANO_INVALIDO", row.empregado, row.ano);
        continue;
      }

      const match = findUser(users, row);
      if (!match.user) {
        if (match.method.includes("ambiguo")) {
          stats.ambiguo += 1;
          console.log("[LOTE] EMPREGADO_AMBIGUO", row.empregado, row.email, match.method);
        } else {
          stats.naoEncontrado += 1;
          console.log("[LOTE] EMPREGADO_NAO_ENCONTRADO", row.empregado, row.email);
        }
        continue;
      }

      const user = match.user;
      const [questionarios] = await db.execute(
        "SELECT id,ano,versao,status,fonte,arquivo_origem_nome FROM questionarios_atividades_funcao WHERE colaborador_id=? ORDER BY ano DESC,versao DESC,id DESC",
        [user.id]
      );

      const maisRecente = questionarios[0];
      if (maisRecente && Number(maisRecente.ano) > ano) {
        stats.maisRecenteExiste += 1;
        console.log("[LOTE] VERSAO_MAIS_RECENTE_JA_EXISTE", row.empregado, "csv", ano, "banco", maisRecente.ano, "questionario", maisRecente.id);
        continue;
      }

      const mesmoAno = questionarios.find((q) => Number(q.ano) === ano);
      if (mesmoAno) {
        stats.jaExisteMesmoAno += 1;
        console.log("[LOTE] JA_EXISTE_MESMO_ANO", row.empregado, ano, "questionario", mesmoAno.id);
        continue;
      }

      const url = row.drive_id
        ? "https://drive.google.com/file/d/" + row.drive_id + "/view"
        : (row.link_drive || null);
      const observacoes = buildObservation(row);

      if (!apply) {
        stats.simulados += 1;
        console.log("[LOTE] CRIARIA", row.empregado, ano, "usuario", user.id, "match", match.method);
        continue;
      }

      await db.beginTransaction();
      try {
        const [checkMesmoAno] = await db.execute(
          "SELECT id FROM questionarios_atividades_funcao WHERE colaborador_id=? AND ano=? ORDER BY versao DESC,id DESC LIMIT 1 FOR UPDATE",
          [user.id, ano]
        );
        if (checkMesmoAno.length) {
          await db.rollback();
          stats.jaExisteMesmoAno += 1;
          console.log("[LOTE] JA_EXISTE_MESMO_ANO_APOS_LOCK", row.empregado, ano, checkMesmoAno[0].id);
          continue;
        }

        const [checkMaisRecente] = await db.execute(
          "SELECT id,ano FROM questionarios_atividades_funcao WHERE colaborador_id=? ORDER BY ano DESC,versao DESC,id DESC LIMIT 1 FOR UPDATE",
          [user.id]
        );
        if (checkMaisRecente.length && Number(checkMaisRecente[0].ano) > ano) {
          await db.rollback();
          stats.maisRecenteExiste += 1;
          console.log("[LOTE] VERSAO_MAIS_RECENTE_APOS_LOCK", row.empregado, "csv", ano, "banco", checkMaisRecente[0].ano);
          continue;
        }

        const [ins] = await db.execute(
          "INSERT INTO questionarios_atividades_funcao (colaborador_id,ano,versao,status,fonte,arquivo_origem_nome,arquivo_origem_url,observacoes,preenchido_por) VALUES (?,?,1,'preenchido','importado_historico',?,?,?,?)",
          [user.id, ano, row.arquivo || null, url, observacoes, user.id]
        );

        for (const [chave, pergunta, ordem] of PERGUNTAS) {
          const resposta =
            Object.prototype.hasOwnProperty.call(row, chave) &&
            String(row[chave] || "").trim() !== ""
              ? row[chave]
              : null;

          await db.execute(
            "INSERT INTO questionario_atividades_respostas (questionario_id,chave,pergunta,resposta,ordem) VALUES (?,?,?,?,?)",
            [ins.insertId, chave, pergunta, resposta, ordem]
          );
        }

        await db.commit();
        stats.criados += 1;
        console.log("[LOTE] CRIADO", row.empregado, ano, "questionario", ins.insertId, "match", match.method);
      } catch (error) {
        await db.rollback();
        stats.erros += 1;
        console.error("[LOTE] ERRO_REGISTRO", row.empregado, ano, error);
      }
    }

    console.log("[LOTE] RESUMO", JSON.stringify(stats));
    if (apply && stats.erros > 0) process.exitCode = 2;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("[LOTE] ERRO_FATAL", error);
  process.exit(1);
});
