const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DATA_PATH = path.join(__dirname, '..', 'data', 'regionais_hist_compact.json');
const SOURCE = 'gabarito_empregados.xlsx/Detalhado + eixo da prova historica 2025 cadastrada no PDI-System';

function norm(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function axisKey(v) {
  return norm(v).replace(/\s+/g, '-');
}

function questionNumber(q, fallbackIndex) {
  const candidates = [q?.id, q?.numero, q?.numeroQuestao, q?.ordem];
  for (const candidate of candidates) {
    const n = Number(String(candidate ?? '').trim());
    if (Number.isInteger(n) && n >= 1 && n <= 65) return n;
  }
  return fallbackIndex + 1;
}

function axisName(q) {
  const eixos = Array.isArray(q?.eixos) ? q.eixos : [];
  const names = eixos
    .map((x) => (typeof x === 'string' ? x : x?.nome))
    .filter(Boolean)
    .map((x) => String(x).trim())
    .filter(Boolean);

  if (names.length === 1) return names[0];
  if (names.length > 1) throw new Error(`Questao com mais de um eixo principal: ${JSON.stringify(names)}`);

  const eixo = q?.eixo;
  if (typeof eixo === 'string' && eixo.trim()) return eixo.trim();
  if (eixo?.nome) return String(eixo.nome).trim();

  throw new Error('Questao sem eixo tecnico.');
}

const REGIONAL_CODE = {
  'regional bico do papagaio': 'RBP',
  'regional metropolitana': 'RME',
  'regional vale do araguaia': 'RVA',
  'regional portal do jalapao': 'RPJ',
  'regional norte': 'RNO',
  'regional medio norte colinas': 'RMN',
  'regional serras gerais': 'RSG',
  'regional sul': 'RSU',
};

const NAME_ALIAS = {
  'vandebergue araujo silva jr': 'vandebergue araujo silva junior',
};

function readData() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data) || data.length !== 59) {
    throw new Error(`Arquivo de dados invalido: esperado 59 empregados, encontrado ${Array.isArray(data) ? data.length : 'nao-array'}.`);
  }
  return data;
}

function validateCompactRow(d) {
  if (!d || typeof d !== 'object') throw new Error('Registro de empregado invalido.');
  if (!d.u || !d.n) throw new Error('Regional ou nome ausente.');
  if (typeof d.r !== 'string' || typeof d.g !== 'string' || typeof d.s !== 'string') {
    throw new Error('Respostas, gabarito ou status ausentes.');
  }
  if (d.r.length !== 65 || d.g.length !== 65 || d.s.length !== 65) {
    throw new Error(`Comprimento invalido: respostas=${d.r.length}, gabarito=${d.g.length}, status=${d.s.length}.`);
  }
  if (!/^[A-F-]{65}$/.test(d.r)) throw new Error('Respostas contem caracteres invalidos.');
  if (!/^[A-F]{65}$/.test(d.g)) throw new Error('Gabarito contem caracteres invalidos.');
  if (!/^[CEN]{65}$/.test(d.s)) throw new Error('Status contem caracteres invalidos; esperado apenas C/E/N.');

  let correct = 0;
  for (let i = 0; i < 65; i++) {
    const resp = d.r[i];
    const gab = d.g[i];
    const st = d.s[i];
    if (st === 'C') {
      if (resp !== gab) throw new Error(`Questao ${i + 1}: status CERTO, mas resposta ${resp} difere do gabarito ${gab}.`);
      correct++;
    } else if (st === 'E') {
      if (resp === '-' || resp === gab) throw new Error(`Questao ${i + 1}: status ERRADO inconsistente com resposta/gabarito.`);
    } else if (st === 'N') {
      if (resp !== '-') throw new Error(`Questao ${i + 1}: status NAO_RESPONDEU, mas existe resposta ${resp}.`);
    }
  }
  if (correct !== Number(d.a)) {
    throw new Error(`Total de acertos inconsistente: status=${correct}, resumo=${d.a}.`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL ausente.');
  const data = readData();
  data.forEach(validateCompactRow);

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  const pending = [];
  const prepared = [];

  try {
    const [users] = await db.execute('SELECT id, name, email, status FROM users');
    const usersByName = new Map();
    for (const user of users) {
      const k = norm(user.name);
      if (!usersByName.has(k)) usersByName.set(k, []);
      usersByName.get(k).push(user);
    }

    const [proofs] = await db.execute(`
      SELECT id, codigo, unidade, questoes_json AS questoesJson
      FROM provas_importadas
      WHERE ano = 2025 AND codigo LIKE 'REGIONAIS%HIST%'
    `);

    if (proofs.length !== 8) {
      throw new Error(`Esperadas 8 provas historicas das Regionais; encontradas ${proofs.length}.`);
    }

    for (const d of data) {
      try {
        const regionalCode = REGIONAL_CODE[norm(d.u)];
        if (!regionalCode) throw new Error(`Regional sem codigo conhecido: ${d.u}`);

        const proof = proofs.find((p) => String(p.codigo || '').toUpperCase().includes(`_${regionalCode}_HIST`));
        if (!proof) throw new Error(`Prova historica nao localizada para ${d.u}.`);

        const nameKey = NAME_ALIAS[norm(d.n)] || norm(d.n);
        const matches = usersByName.get(nameKey) || [];
        if (matches.length !== 1) {
          throw new Error(`Correspondencia de usuario nao unica: ${matches.length}.`);
        }
        const user = matches[0];

        let questions = typeof proof.questoesJson === 'string' ? JSON.parse(proof.questoesJson) : proof.questoesJson;
        if (!Array.isArray(questions) || questions.length !== 65) {
          throw new Error(`Prova ${proof.codigo} nao possui 65 questoes.`);
        }

        const questionsByNumber = new Map();
        questions.forEach((q, i) => {
          const n = questionNumber(q, i);
          if (questionsByNumber.has(n)) throw new Error(`Numero de questao duplicado na prova: ${n}.`);
          questionsByNumber.set(n, q);
        });
        if (questionsByNumber.size !== 65) throw new Error(`Prova ${proof.codigo} nao possui numeros unicos de 1 a 65.`);

        const axes = new Map();
        const rows = [];
        let correct = 0;
        let notAnswered = 0;

        for (let i = 0; i < 65; i++) {
          const n = i + 1;
          const q = questionsByNumber.get(n);
          if (!q) throw new Error(`Questao ${n} nao localizada na prova ${proof.codigo}.`);

          const eixoNome = axisName(q);
          const eixoChave = axisKey(eixoNome);
          const statusChar = d.s[i];
          const result = statusChar === 'C' ? 'CERTO' : statusChar === 'E' ? 'ERRADO' : 'NAO_RESPONDEU';
          const response = d.r[i] === '-' ? null : d.r[i];
          const answerKey = d.g[i];

          if (result === 'CERTO') correct++;
          if (result === 'NAO_RESPONDEU') notAnswered++;

          if (!axes.has(eixoChave)) {
            axes.set(eixoChave, { nome: eixoNome, total: 0, acertos: 0, naoRespondidas: 0 });
          }
          const axis = axes.get(eixoChave);
          axis.total++;
          if (result === 'CERTO') axis.acertos++;
          if (result === 'NAO_RESPONDEU') axis.naoRespondidas++;

          rows.push({
            n,
            eixoChave,
            eixoNome,
            response,
            answerKey,
            result,
          });
        }

        if (correct !== Number(d.a)) {
          throw new Error(`Total de acertos calculado (${correct}) diverge do resumo (${d.a}).`);
        }
        if (axes.size !== 11) {
          throw new Error(`Prova ${proof.codigo} resultou em ${axes.size} eixos; esperado 11.`);
        }

        prepared.push({ data: d, user, proof, rows, axes, correct, notAnswered });
      } catch (error) {
        pending.push({ empregado: d.n, regional: d.u, motivo: error.message });
      }
    }

    const baseSummary = {
      apply: APPLY,
      totalEmpregados: data.length,
      preparados: prepared.length,
      pendencias: pending.length,
      totalRespostas: prepared.length * 65,
      totalEixos: prepared.reduce((sum, item) => sum + item.axes.size, 0),
      totalCertas: prepared.reduce((sum, item) => sum + item.correct, 0),
      totalNaoRespondidas: prepared.reduce((sum, item) => sum + item.notAnswered, 0),
      pendenciasDetalhadas: pending,
    };

    if (pending.length > 0) {
      console.error('HIST_LOAD=' + JSON.stringify(baseSummary));
      throw new Error(`Carga bloqueada por ${pending.length} pendencia(s). Nenhum dado foi gravado.`);
    }

    if (!APPLY) {
      console.log('HIST_LOAD=' + JSON.stringify(baseSummary));
      return;
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS registro_historico_proficiencia_respostas (
        id INT NOT NULL AUTO_INCREMENT,
        colaborador_id INT NOT NULL,
        prova_historica_id INT NOT NULL,
        questao_chave VARCHAR(50) NOT NULL,
        numero_questao INT NOT NULL,
        eixo_chave VARCHAR(255) NOT NULL,
        eixo_nome VARCHAR(255) NOT NULL,
        resposta_marcada VARCHAR(10) NULL,
        gabarito VARCHAR(10) NOT NULL,
        resultado ENUM('CERTO','ERRADO','NAO_RESPONDEU') NOT NULL,
        fonte TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY registro_historico_resposta_unique_idx (colaborador_id, prova_historica_id, questao_chave),
        KEY registro_historico_resposta_colaborador_idx (colaborador_id),
        KEY registro_historico_resposta_prova_idx (prova_historica_id),
        KEY registro_historico_resposta_eixo_idx (eixo_chave),
        KEY registro_historico_resposta_resultado_idx (resultado),
        CONSTRAINT registro_historico_resposta_colaborador_fk FOREIGN KEY (colaborador_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await db.beginTransaction();
    try {
      for (const p of prepared) {
        for (const r of p.rows) {
          await db.execute(`
            INSERT INTO registro_historico_proficiencia_respostas
              (colaborador_id, prova_historica_id, questao_chave, numero_questao, eixo_chave, eixo_nome,
               resposta_marcada, gabarito, resultado, fonte)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              numero_questao = VALUES(numero_questao),
              eixo_chave = VALUES(eixo_chave),
              eixo_nome = VALUES(eixo_nome),
              resposta_marcada = VALUES(resposta_marcada),
              gabarito = VALUES(gabarito),
              resultado = VALUES(resultado),
              fonte = VALUES(fonte)
          `, [
            p.user.id,
            p.proof.id,
            `Q${String(r.n).padStart(2, '0')}`,
            r.n,
            r.eixoChave,
            r.eixoNome,
            r.response,
            r.answerKey,
            r.result,
            SOURCE,
          ]);
        }

        for (const [eixoChave, axis] of p.axes) {
          const percentage = Number(((axis.acertos / axis.total) * 100).toFixed(2));
          await db.execute(`
            INSERT INTO registro_historico_proficiencia_eixos
              (colaborador_id, prova_historica_id, eixo_chave, eixo_nome, percentual_original,
               acertos_original, total_questoes_original, nao_sei_original, status, fonte)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'REGISTRADO', ?)
            ON DUPLICATE KEY UPDATE
              eixo_nome = VALUES(eixo_nome),
              percentual_original = VALUES(percentual_original),
              acertos_original = VALUES(acertos_original),
              total_questoes_original = VALUES(total_questoes_original),
              nao_sei_original = VALUES(nao_sei_original),
              status = 'REGISTRADO',
              fonte = VALUES(fonte)
          `, [
            p.user.id,
            p.proof.id,
            eixoChave,
            axis.nome,
            percentage,
            axis.acertos,
            axis.total,
            axis.naoRespondidas,
            SOURCE,
          ]);
        }
      }

      const [responseCountRows] = await db.execute(
        'SELECT COUNT(*) AS total FROM registro_historico_proficiencia_respostas WHERE fonte = ?',
        [SOURCE]
      );
      const [axisCountRows] = await db.execute(
        'SELECT COUNT(*) AS total FROM registro_historico_proficiencia_eixos WHERE fonte = ?',
        [SOURCE]
      );
      const [employeeCountRows] = await db.execute(
        'SELECT COUNT(DISTINCT colaborador_id) AS total FROM registro_historico_proficiencia_respostas WHERE fonte = ?',
        [SOURCE]
      );

      const respostasGravadas = Number(responseCountRows[0]?.total || 0);
      const eixosGravados = Number(axisCountRows[0]?.total || 0);
      const empregadosGravados = Number(employeeCountRows[0]?.total || 0);

      if (respostasGravadas !== 3835 || eixosGravados !== 649 || empregadosGravados !== 59) {
        throw new Error(
          `Verificacao final falhou: empregados=${empregadosGravados}, respostas=${respostasGravadas}, eixos=${eixosGravados}.`
        );
      }

      await db.commit();

      console.log('HIST_LOAD=' + JSON.stringify({
        ...baseSummary,
        gravado: true,
        empregadosGravados,
        respostasGravadas,
        eixosGravados,
      }));
    } catch (error) {
      await db.rollback();
      throw error;
    }
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('FATAL=' + (error?.stack || error));
  process.exit(1);
});
