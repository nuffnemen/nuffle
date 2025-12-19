const fs = require("node:fs");
const path = require("node:path");
const { defineConfig } = require("prisma/config");

const loadEnvFile = (relativePath) => {
  const filePath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(filePath)) {
    return;
  }
  const contents = fs.readFileSync(filePath, "utf-8");
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      return;
    }
    const key = trimmed.slice(0, equalsIndex);
    let value = trimmed.slice(equalsIndex + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

[".env.local", ".env"].forEach(loadEnvFile);

console.log("Prisma config loading DATABASE_URL:", Boolean(process.env.DATABASE_URL));

module.exports = defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    seed: "ts-node prisma/seed.ts",
  },
});
