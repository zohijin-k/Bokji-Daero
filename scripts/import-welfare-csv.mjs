import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diffNormalizedSnapshots, normalizeCentralWelfareRows } from "../src/lib/data/benefit-catalog.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputPath = process.argv[2] ? resolve(process.argv[2]) : null;
if (!inputPath) {
  console.error("Usage: npm run data:import -- /path/to/official-central-welfare.csv");
  process.exit(2);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    if (row.some((cell) => cell.trim())) rows.push(row);
  }
  if (quoted) throw new Error("CSV has an unclosed quoted field.");
  if (rows.length < 2) throw new Error("CSV must include a header and at least one data row.");
  const headers = rows[0].map((cell) => cell.replace(/^\uFEFF/, "").trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, i) => [header, cells[i] ?? ""])));
}

const retrievedAt = new Date().toISOString();
const date = retrievedAt.slice(0, 10);
const rawDir = resolve(root, "data/raw");
const normalizedDir = resolve(root, "data/normalized");
const changesDir = resolve(root, "data/changes");
await Promise.all([mkdir(rawDir, { recursive: true }), mkdir(normalizedDir, { recursive: true }), mkdir(changesDir, { recursive: true })]);

const bytes = await readFile(inputPath);
const rawHash = createHash("sha256").update(bytes).digest("hex");
const rawPath = resolve(rawDir, `central-welfare-${date}-${rawHash.slice(0, 12)}.csv`);
await copyFile(inputPath, rawPath);

try {
  const csvText = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const rows = parseCsv(csvText);
  const snapshot = normalizeCentralWelfareRows(rows, retrievedAt, basename(inputPath));
  if (!snapshot.records.length) throw new Error("No rows with documented service ID and name fields were found.");

  const latestPath = resolve(normalizedDir, "central-welfare-latest.json");
  let previous = null;
  try { previous = JSON.parse(await readFile(latestPath, "utf8")); } catch { /* first import */ }
  const diff = diffNormalizedSnapshots(previous, snapshot);
  const changes = {
    dataset: snapshot.dataset,
    retrievedAt,
    ...diff,
    rawFile: `data/raw/${basename(rawPath)}`,
    sourceFileName: basename(inputPath),
    encoding: "UTF-8 (strictly decoded)",
    rawSha256: rawHash,
    validation: snapshot.validation,
  };
  await Promise.all([
    writeFile(latestPath, `${JSON.stringify(snapshot, null, 2)}\n`),
    writeFile(resolve(normalizedDir, `central-welfare-${date}.json`), `${JSON.stringify(snapshot, null, 2)}\n`),
    writeFile(resolve(changesDir, `central-welfare-${date}.json`), `${JSON.stringify(changes, null, 2)}\n`),
    writeFile(resolve(normalizedDir, "sync-status.json"), `${JSON.stringify({ status: "metadata_imported", retrievedAt, sourceRecordCount: snapshot.sourceRecordCount, normalizedRecordCount: snapshot.records.length, rawFile: changes.rawFile, sourceFileName: changes.sourceFileName, validation: snapshot.validation }, null, 2)}\n`),
  ]);
  console.log(`Imported ${snapshot.records.length} metadata records. Eligibility fields remain null until sourced and verified.`);
} catch (error) {
  const safeMessage = error instanceof Error ? error.message : "Unknown import error";
  await writeFile(resolve(normalizedDir, "sync-status.json"), `${JSON.stringify({ status: "import_failed", observedAt: retrievedAt, rawFile: `data/raw/${basename(rawPath)}`, message: safeMessage }, null, 2)}\n`);
  console.error(safeMessage);
  process.exit(1);
}
