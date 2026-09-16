const mysql = require('mysql2/promise');

const competencias = [
  // BASICAS
  ['Atenção', 'BASICA'],
  ['Autopercepção', 'BASICA'],
  ['Disciplina', 'BASICA'],
  ['Empatia', 'BASICA'],
  ['Escuta Ativa', 'BASICA'],
  ['Gestão de Tempo', 'BASICA'],
  ['Memória', 'BASICA'],
  ['Raciocínio Lógico e Espacial', 'BASICA'],

  // ESSENCIAIS
  ['Adaptabilidade', 'ESSENCIAL'],
  ['Leitura de Cenário', 'ESSENCIAL'],
  ['Planejamento e Organização', 'ESSENCIAL'],
  ['Comunicação Assertiva', 'ESSENCIAL'],
  ['Inteligência Emocional', 'ESSENCIAL'],
  ['Resiliência', 'ESSENCIAL'],
  ['Proatividade', 'ESSENCIAL'],

  // MASTER
  ['Accountability', 'MASTER'],
  ['Foco em Resultados', 'MASTER'],
  ['Gestão de Conflitos', 'MASTER'],
  ['Gestão de Equipes', 'MASTER'],
  ['Gestão de Pessoas', 'MASTER'],
  ['Influência', 'MASTER'],
  ['Negociação', 'MASTER'],
  ['Presença Executiva', 'MASTER'],
  ['Protagonismo', 'MASTER'],
  ['Relacionamentos Conectivos', 'MASTER'],
  ['Responsabilidade Social', 'MASTER'],
  ['Tomada de Decisão', 'MASTER'],
  ['Visão Estratégica', 'MASTER'],

  // JORNADA DO FUTURO
  ['Mindset Visionário', 'JORNADA_FUTURO'],
  ['Arquitetura de Mudanças', 'JORNADA_FUTURO'],
  ['Radar de Cenários', 'JORNADA_FUTURO'],
  ['Mentalidade Sistêmica', 'JORNADA_FUTURO'],
  ['Estratégia de Longo Alcance', 'JORNADA_FUTURO'],
  ['Adaptabilidade Dinâmica', 'JORNADA_FUTURO'],
  ['Decisões Ágeis', 'JORNADA_FUTURO'],
  ['Gestão da Comunicação', 'JORNADA_FUTURO'],
  ['Inteligência Emocional Tática', 'JORNADA_FUTURO'],
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida. Carga não executada.');

  const connection = await mysql.createConnection(url);

  try {
    const [tableRows] = await connection.query(`
      SELECT TABLE_NAME
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'metodologia_competencias'
    `);

    if (!Array.isArray(tableRows) || tableRows.length !== 1) {
      throw new Error('Tabela metodologia_competencias não encontrada. Carga cancelada.');
    }

    await connection.beginTransaction();

    for (const [nome, familia] of competencias) {
      await connection.query(
        `
          INSERT INTO metodologia_competencias
            (nome, familia, versao, ativa)
          SELECT ?, ?, 1, TRUE
          WHERE NOT EXISTS (
            SELECT 1
            FROM metodologia_competencias
            WHERE nome = ? AND versao = 1
          )
        `,
        [nome, familia, nome],
      );
    }

    await connection.commit();

    const [rows] = await connection.query(`
      SELECT nome, familia, versao, ativa
      FROM metodologia_competencias
      WHERE versao = 1
        AND nome IN (${competencias.map(() => '?').join(',')})
      ORDER BY FIELD(familia, 'BASICA', 'ESSENCIAL', 'MASTER', 'JORNADA_FUTURO'), nome
    `, competencias.map(([nome]) => nome));

    if (!Array.isArray(rows) || rows.length !== competencias.length) {
      throw new Error(
        `Carga incompleta: esperadas ${competencias.length} competências, encontradas ${Array.isArray(rows) ? rows.length : 0}.`,
      );
    }

    const inconsistencias = [];
    for (const row of rows) {
      const esperado = competencias.find(([nome]) => nome === row.nome);
      if (!esperado || esperado[1] !== row.familia) {
        inconsistencias.push(`${row.nome}: banco=${row.familia}, esperado=${esperado ? esperado[1] : 'N/A'}`);
      }
    }

    if (inconsistencias.length > 0) {
      throw new Error(`Famílias divergentes: ${inconsistencias.join('; ')}`);
    }

    const totais = rows.reduce((acc, row) => {
      acc[row.familia] = (acc[row.familia] || 0) + 1;
      return acc;
    }, {});

    const esperadoTotais = {
      BASICA: 8,
      ESSENCIAL: 7,
      MASTER: 13,
      JORNADA_FUTURO: 9,
    };

    for (const [familia, totalEsperado] of Object.entries(esperadoTotais)) {
      if ((totais[familia] || 0) !== totalEsperado) {
        throw new Error(
          `Quantidade divergente em ${familia}: banco=${totais[familia] || 0}, esperado=${totalEsperado}.`,
        );
      }
    }

    console.log(
      `Carga metodológica CKM validada: ${rows.length} competências ` +
      `(8 Básicas, 7 Essenciais, 13 Master, 9 Jornada do Futuro).`,
    );
  } catch (error) {
    try {
      await connection.rollback();
    } catch (_) {
      // Sem ação: rollback pode não ser aplicável se a transação já tiver sido concluída.
    }
    throw error;
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Falha na carga da metodologia CKM:', error);
  process.exit(1);
});
