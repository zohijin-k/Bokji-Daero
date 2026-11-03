import { mkdir, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

const datasetUrl = "https://www.data.go.kr/data/15083323/fileData.do";
const portalBase = "https://www.data.go.kr";
const timeoutMs = 30_000;

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${new URL(url).host}`);
  return response;
}

function requiredMatch(text, expression, label) {
  const match = text.match(expression);
  if (!match) throw new Error(`Official dataset page did not expose ${label}. Download manually from ${datasetUrl}.`);
  return match[1];
}

try {
  const page = await (await request(datasetUrl)).text();
  const publicDataPk = requiredMatch(page, /id="publicDataPk"[^>]*value="([^"]+)"/, "dataset ID");
  const publicDataDetailPk = requiredMatch(page, /id="publicDataDetailPk"[^>]*value="([^"]+)"/, "dataset version ID");
  const match = page.match(/onclick="fileDetailObj\.fn_fileDataDown\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'[^']*'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\)"/);
  if (!match) throw new Error("Could not parse the official file download button.");
  const [, buttonDataPk, buttonDetailPk, fileDetailSn, publicDataHistSn] = match;
  if (buttonDataPk !== publicDataPk || buttonDetailPk !== publicDataDetailPk) {
    throw new Error("The official page download metadata does not match its dataset IDs.");
  }
  const metadataBody = new URLSearchParams({
    publicDataDetailPk,
    publicDataPk,
    atchFileId: "",
    fileDetailSn,
    publicDataTyCode: "PR0051",
    publicDataHistSn,
  });
  const metadataText = await (await request(`${portalBase}/tcs/dss/selectFileDataDownload.do`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: metadataBody,
  })).text();
  const metadata = JSON.parse(metadataText);
  if (metadata.status !== true || !metadata.atchFileId || !metadata.fileDetailSn || !metadata.dataSetFileDetailInfo?.dataNm) {
    throw new Error(metadata.error || "The official portal did not provide downloadable file metadata.");
  }

  const originalName = metadata.dataSetFileDetailInfo.orginlFileNm || `${metadata.dataSetFileDetailInfo.dataNm}.csv`;
  if (!/\.csv$/i.test(originalName)) throw new Error(`Expected an official CSV file, received ${originalName}.`);
  const downloadQuery = new URLSearchParams({
    atchFileId: metadata.atchFileId,
    fileDetailSn: metadata.fileDetailSn,
    dataNm: metadata.dataSetFileDetailInfo.dataNm,
  });
  const fileResponse = await request(`${portalBase}/cmm/cmm/fileDownload.do?${downloadQuery}`);
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  if (bytes.length === 0 || bytes.length > 20_000_000) throw new Error(`Unexpected file size: ${bytes.length} bytes.`);
  new TextDecoder("utf-8", { fatal: true }).decode(bytes);

  const inbox = resolve(process.cwd(), "data/inbox");
  await mkdir(inbox, { recursive: true });
  const outputPath = resolve(inbox, basename(originalName));
  await writeFile(outputPath, bytes, { flag: "w" });
  console.log(`Downloaded ${bytes.length} bytes from ${datasetUrl} to ${outputPath}. Run data:import to normalize and validate it.`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Official CSV download failed.";
  console.error(message);
  process.exit(1);
}
