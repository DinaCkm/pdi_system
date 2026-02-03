import { drizzle } from 'drizzle-orm/mysql2';
import { sql } from 'drizzle-orm';

// CPFs da lista fornecida
const cpfsLista = `151959097 151959098 151959099 151959100 151959101 254252182 254252183 585213134 595687117 595687118 595687119 595687120 633238177 633238178 633238179 667836149 667836150 667836151 702288175 702288176 702288177 702288178 737192183 737192184 737192185 760659107 760659108 888269101 888307135 912378156 912378157 925595137 925595138 925595139 925595140 925595141 925595142 925595143 973002171 973002172 973002173 982462165 1027817296 1354878105 1354878106 1354878107 1354878108 1354878109 1354878110 1354878111 1354878112 1354878113 1354878114 1354878115 1523606113 1523606114 1523606115 1523606116 1523606117 1626149181 1626149182 1626149183 1626149184 1626149185 1710584102 1710584103 1710584104 1710584105 1763287179 1763287180 1900479173 1900479174 1900479175 1999809338 1999809339 1999809340 1999809341 1999809342 2105678125 2105678126 2105678127 2105678128 2105678129 2327468182 2387300180 2410232114 2410232115 2455963132 2455963133 2455963134 2455963135 2499403095 2499403096 2499403097 2499403098 2499403099 2499403100 2644259432 2644259433 2644259434 2644259435 2644259436 2644259437 2644259438 2644259439 2644259440 2644259441 2644259442 2644259443 2716939318 2716939319 2716939320 2716939321 3005691139 3005691140 3005691141 3005691142 3005691143 3063762100 3063762101 3063762102 3063762103 3063762104 3154888157 3154888158 3154888159 3178068148 3178068149 3178068150 3178068151 3178068152 3178068153 3178068154 3313815160 3313815161 3319840590 3319840591 3331188121 3331188122 3419311108 3568395168 3634062127 3634062128 3634062129 3634062130 3651646155 3651646156 3866199137 3866199138 4217398189 4253311127 4253311128 4253311129 4436929124 4573619135 4653993122 6035815103 6463327328 7513556156 8946172657 22805419391 25443186353 27878074100 39646955800 49954237372 51803364149 56076797134 57389241187 57590664049 58693408453 61687448434 62324560178 64374831134 64385647100 70082097119 72659424187 77768400178 80027750159 81065159153 83225919187 84707003168 84907479115 85624314191 86622536104 87238314487 87809575104 88126692391 88349195134 92391842287 94111820115 96270454115 99743485104 99904632634`;

// Converter para set de CPFs únicos
const cpfsSet = new Set(cpfsLista.split(/\s+/).filter(cpf => cpf.trim()));

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  
  // Buscar todos os CPFs do banco
  const result = await db.execute(sql`SELECT cpf, name FROM users WHERE cpf IS NOT NULL`);
  const rows = result[0];
  
  // Criar mapa de CPFs do banco (sem formatação)
  const cpfsBanco = new Map();
  for (const row of rows) {
    if (row.cpf) {
      const cpfLimpo = row.cpf.replace(/\D/g, '');
      cpfsBanco.set(cpfLimpo, row.name);
    }
  }
  
  console.log(`\n=== RESUMO ===`);
  console.log(`Total de CPFs na lista: ${cpfsSet.size}`);
  console.log(`Total de CPFs no banco: ${cpfsBanco.size}`);
  
  // Verificar quais CPFs da lista existem no banco
  const existem = [];
  const naoExistem = [];
  
  for (const cpf of cpfsSet) {
    // Tentar encontrar com padding de zeros à esquerda (CPF tem 11 dígitos)
    const cpfPadded = cpf.padStart(11, '0');
    const cpfSemZeros = cpf.replace(/^0+/, '');
    
    let encontrado = false;
    for (const [cpfBanco, nome] of cpfsBanco) {
      const cpfBancoSemZeros = cpfBanco.replace(/^0+/, '');
      if (cpfBanco === cpf || cpfBanco === cpfPadded || cpfBancoSemZeros === cpfSemZeros) {
        existem.push({ cpf, nome });
        encontrado = true;
        break;
      }
    }
    
    if (!encontrado) {
      naoExistem.push(cpf);
    }
  }
  
  console.log(`CPFs encontrados no banco: ${existem.length}`);
  console.log(`CPFs NÃO encontrados: ${naoExistem.length}`);
  
  if (naoExistem.length > 0) {
    console.log(`\n=== CPFs NÃO ENCONTRADOS (${naoExistem.length}) ===`);
    naoExistem.sort((a, b) => parseInt(a) - parseInt(b));
    for (const cpf of naoExistem) {
      console.log(cpf);
    }
  }
  
  if (existem.length > 0) {
    console.log(`\n=== CPFs ENCONTRADOS (${existem.length}) ===`);
    for (const { cpf, nome } of existem.slice(0, 10)) {
      console.log(`${cpf} -> ${nome}`);
    }
    if (existem.length > 10) {
      console.log(`... e mais ${existem.length - 10} CPFs`);
    }
  }
  
  process.exit(0);
}

main().catch(console.error);
