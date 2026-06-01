import crypto from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";

if (fs.existsSync(".dev.vars")) {
  const envConfig = fs.readFileSync(".dev.vars", "utf8");
  envConfig.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || "";
      value = value.replace(/^(['"])(.*)\1$/, "$2"); // Remover comillas si existen
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  });
}

const args = process.argv.slice(2);
const isRemote = args.includes("--remote");

const username = process.env.ADMIN_USERNAME || args[0];
const password = process.env.ADMIN_PASSWORD || args[1];

if (!username || !password) {
  console.error(
    "Uso: Definir ADMIN_USERNAME y ADMIN_PASSWORD en variables de entorno o .dev.vars",
  );
  console.error(
    "O alternativamente: npm run create-admin <username> <password> [--remote]",
  );
  process.exit(1);
}

const hash = crypto.createHash("sha256").update(password).digest("hex");

console.log(` Validando administrador: ${username}`);
console.log(` Contraseña hasheada correctamente.`);

const command = `INSERT OR IGNORE INTO admins (username, password_hash) VALUES ('${username}', '${hash}');`;

const wranglerCmd = `npx wrangler d1 execute stories-manager ${
  isRemote ? "--remote" : "--local"
} --command="${command}"`;

console.log(
  `\n Ejecutando comando en la base de datos ${isRemote ? "REMOTA (Producción)" : "LOCAL"}...`,
);

try {
  execSync(wranglerCmd, { stdio: "inherit" });
  console.log(
    `\n¡Proceso finalizado! Si el administrador '${username}' no existía, fue creado con éxito.`,
  );
} catch (error) {
  console.error(
    "\n Error al intentar registrar el administrador en la base de datos.",
  );
  process.exit(1);
}
