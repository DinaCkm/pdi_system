const mysql=require("mysql2/promise");
async function main(){
 const db=await mysql.createConnection(process.env.DATABASE_URL);
 try{
  const [cols]=await db.execute(`
    SELECT TABLE_NAME tabela,
           GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION SEPARATOR ',') colunas
      FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA=DATABASE()
       AND (
         LOWER(COLUMN_NAME) LIKE '%arquivo%' OR LOWER(COLUMN_NAME) LIKE '%file%' OR
         LOWER(COLUMN_NAME) LIKE '%url%' OR LOWER(COLUMN_NAME) LIKE '%anexo%' OR
         LOWER(COLUMN_NAME) LIKE '%prova%' OR LOWER(COLUMN_NAME) LIKE '%resultado%' OR
         LOWER(COLUMN_NAME) LIKE '%certif%' OR LOWER(COLUMN_NAME) LIKE '%resposta%'
       )
     GROUP BY TABLE_NAME
     ORDER BY TABLE_NAME
  `);
  console.log("FILE_TABLES="+JSON.stringify(cols));
 }finally{await db.end()}
}
main().catch(e=>{console.error("FATAL="+e.stack);process.exit(1)});