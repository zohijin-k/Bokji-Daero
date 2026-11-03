import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { createDataSourceFailureStatus } from "../src/lib/data/benefit-catalog.ts";

const root = process.cwd();
const statusPath = resolve(root, "data/normalized/sync-status.json");
const rawDir = resolve(root, "data/raw");
const observedAt = new Date().toISOString();
const apiKey = process.env.WELFARE_API_KEY;
const operation = process.env.WELFARE_API_OPERATION;
const base = "https://apis.data.go.kr/B554287/NationalWelfareInformationsV001";
await mkdir(dirname(statusPath), { recursive: true });

function fail(message) {
  return readFile(statusPath, "utf8")
    .then((raw) => JSON.parse(raw))
    .then((previous) => previous.status === "raw_api_response_saved" ? previous.observedAt : null)
    .catch(() => null)
    .then((lastGoodSnapshotAt) => writeFile(statusPath, `${JSON.stringify({
      ...createDataSourceFailureStatus("api_error", observedAt, message, lastGoodSnapshotAt),
      source: base,
    }, null, 2)}\n`))
    .then(() => { console.error(message); process.exit(1); });
}

if (!apiKey) await fail("WELFARE_API_KEY is not set. The API was not called; the current snapshot was left unchanged.");
if (!operation || !/^[A-Za-z0-9_-]+$/.test(operation)) {
  await fail("Set WELFARE_API_OPERATION to an operation path copied from the official data.go.kr Swagger/guide.");
}

await mkdir(rawDir, { recursive: true });
await mkdir(resolve(root, "data/normalized"), { recursive: true });
const url = new URL(`${base}/${operation}`);
url.searchParams.set("serviceKey", apiKey);
url.searchParams.set("pageNo", "1");
url.searchParams.set("numOfRows", "100");
try {
  const extra = process.env.WELFARE_API_PARAMS ? JSON.parse(process.env.WELFARE_API_PARAMS) : {};
  for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, String(value));
} catch {
  await fail("WELFARE_API_PARAMS must be a JSON object; no API request was made.");
}

try {
  const response = await fetch(url, { headers: { accept: "application/xml,text/xml" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const xml = await response.text();
  if (!xml.trim().startsWith("<?xml") && !xml.includes("<response")) throw new Error("Response was not recognized as XML API data");
  const code = xml.match(/<resultCode>\s*([^<]+)\s*<\/resultCode>/)?.[1]?.trim();
  if (code && !["00", "0000"].includes(code)) throw new Error(`Provider returned resultCode ${code}`);
  const hash = createHash("sha256").update(xml).digest("hex");
  const rawPath = resolve(rawDir, `central-welfare-api-${observedAt.slice(0, 10)}-${hash.slice(0, 12)}.xml`);
  await writeFile(rawPath, xml);
  await writeFile(statusPath, `${JSON.stringify({
    status: "raw_api_response_saved",
    observedAt,
    source: base,
    operation,
    rawFile: rawPath.replace(`${root}/`, ""),
    rawSha256: hash,
    normalization: "pending_verified_response_schema",
  }, null, 2)}\n`);
  console.log("Saved the raw official API response. No eligibility fields were inferred from the unverified XML schema.");
} catch (error) {
  const message = error instanceof Error ? error.message : "API request failed";
  await fail(`API request failed: ${message}. Existing raw and normalized snapshots were not replaced.`);
}
