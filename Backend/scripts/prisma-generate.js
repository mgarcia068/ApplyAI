/* eslint-disable no-console */

const { spawnSync } = require('child_process');
const { copyFileSync, existsSync, mkdirSync } = require('fs');
const path = require('path');

function resolveBackendPath(...segments) {
  return path.resolve(__dirname, '..', ...segments);
}

function main() {
  const backendRoot = resolveBackendPath();
  const repoRoot = path.resolve(backendRoot, '..');

  const sourceSchema = path.resolve(repoRoot, 'prisma', 'schema.prisma');
  const targetSchemaDir = path.resolve(backendRoot, 'prisma');
  const targetSchema = path.resolve(targetSchemaDir, 'schema.prisma');

  if (!existsSync(sourceSchema)) {
    console.error(`No se encontró el schema de Prisma en: ${sourceSchema}`);
    process.exit(1);
  }

  mkdirSync(targetSchemaDir, { recursive: true });
  copyFileSync(sourceSchema, targetSchema);

  const prismaCli = path.resolve(backendRoot, 'node_modules', 'prisma', 'build', 'index.js');

  if (!existsSync(prismaCli)) {
    console.error('No se encontró Prisma CLI. Ejecutá primero `npm install` en Backend/.');
    process.exit(1);
  }

  const result = spawnSync(process.execPath, [prismaCli, 'generate', '--schema', targetSchema], {
    cwd: backendRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('Error ejecutando Prisma CLI:', result.error);
  }

  process.exit(result.status ?? 1);
}

main();
