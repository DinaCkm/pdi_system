import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: "pdi_system"
});

const [rows] = await connection.execute("SELECT id, name, email, role FROM users WHERE role = 'admin' LIMIT 1");
console.log("Admin user:", rows[0]);
process.exit(0);
