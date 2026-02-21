import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync
} from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const TOTAL_JUZ = 30;
const BITRATES_KBPS = [96, 80, 64, 56];
const MAX_TOTAL_BYTES = 850 * 1024 * 1024;
const MAX_FILE_BYTES = 90 * 1024 * 1024;

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return fallback;
  }
  return value.slice(prefix.length);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf-8", ...options });
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`${command} ${args.join(" ")} a échoué.\n${details}`);
  }
}

function ensureFfmpeg() {
  run("ffmpeg", ["-version"]);
}

function expectedOutputFile(juzId) {
  return `juz-${String(juzId).padStart(2, "0")}.mp3`;
}

function normalizeMapping(raw, sourceDir) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.entries)) {
    throw new Error("mapping.json invalide: format attendu { entries: [{ juzId, path }] }");
  }

  const normalized = raw.entries.map((entry) => {
    if (!entry || typeof entry !== "object") {
      throw new Error("mapping.json invalide: une entrée est vide.");
    }

    const juzId = Number(entry.juzId);
    const relativePath = typeof entry.path === "string" ? entry.path.trim() : "";
    if (!Number.isInteger(juzId) || juzId < 1 || juzId > TOTAL_JUZ) {
      throw new Error(`mapping.json invalide: juzId doit être entre 1 et 30 (reçu: ${entry.juzId}).`);
    }
    if (!relativePath) {
      throw new Error(`mapping.json invalide: path manquant pour juzId ${juzId}.`);
    }

    const absoluteSource = path.resolve(sourceDir, relativePath);
    return { juzId, absoluteSource };
  });

  const uniqueIds = new Set(normalized.map((item) => item.juzId));
  if (uniqueIds.size !== TOTAL_JUZ) {
    throw new Error(`mapping.json invalide: ${TOTAL_JUZ} juzId uniques requis (reçus: ${uniqueIds.size}).`);
  }

  return normalized.sort((a, b) => a.juzId - b.juzId);
}

function transcodeAll(entries, outputDir, bitrateKbps) {
  mkdirSync(outputDir, { recursive: true });

  for (const entry of entries) {
    const target = path.join(outputDir, expectedOutputFile(entry.juzId));
    run("ffmpeg", [
      "-y",
      "-i",
      entry.absoluteSource,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "44100",
      "-c:a",
      "libmp3lame",
      "-b:a",
      `${bitrateKbps}k`,
      "-minrate",
      `${bitrateKbps}k`,
      "-maxrate",
      `${bitrateKbps}k`,
      "-bufsize",
      `${bitrateKbps * 2}k`,
      target
    ]);
  }
}

function readBudget(outputDir) {
  const files = readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"))
    .map((entry) => path.join(outputDir, entry.name));

  if (files.length !== TOTAL_JUZ) {
    return { valid: false, reason: `Nombre de fichiers générés invalide (${files.length}/${TOTAL_JUZ}).` };
  }

  let total = 0;
  for (const file of files) {
    const size = statSync(file).size;
    total += size;
    if (size > MAX_FILE_BYTES) {
      return {
        valid: false,
        reason: `Fichier trop volumineux: ${path.basename(file)} (${(size / (1024 * 1024)).toFixed(2)} MB).`
      };
    }
  }

  if (total > MAX_TOTAL_BYTES) {
    return { valid: false, reason: `Poids total trop élevé: ${(total / (1024 * 1024)).toFixed(2)} MB.` };
  }

  return { valid: true, total };
}

function copyToFinalDir(tempDir, finalDir) {
  rmSync(finalDir, { recursive: true, force: true });
  mkdirSync(finalDir, { recursive: true });
  const files = readdirSync(tempDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"));
  for (const file of files) {
    const source = path.join(tempDir, file.name);
    const destination = path.join(finalDir, file.name);
    copyFileSync(source, destination);
  }
}

function main() {
  const sourceDir = path.resolve(process.cwd(), parseArg("source-dir", "audio-source"));
  const mappingPath = path.resolve(process.cwd(), parseArg("mapping", "audio-source/mapping.json"));
  const outputDir = path.resolve(process.cwd(), parseArg("output-dir", "public/audio"));

  ensureFfmpeg();
  const rawMapping = JSON.parse(readFileSync(mappingPath, "utf-8"));
  const entries = normalizeMapping(rawMapping, sourceDir);

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "ramadan-audio-"));
  try {
    for (const bitrate of BITRATES_KBPS) {
      const candidateDir = path.join(tempRoot, `${bitrate}k`);
      transcodeAll(entries, candidateDir, bitrate);
      const budget = readBudget(candidateDir);
      if (budget.valid) {
        copyToFinalDir(candidateDir, outputDir);
        const totalMb = (budget.total / (1024 * 1024)).toFixed(2);
        console.log(`[audio:prepare] OK avec ${bitrate} kbps - total ${totalMb} MB.`);
        return;
      }

      console.warn(`[audio:prepare] ${bitrate} kbps rejeté: ${budget.reason}`);
    }
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }

  throw new Error("Impossible de respecter le budget audio avec les bitrates 96/80/64/56 kbps.");
}

try {
  main();
} catch (error) {
  console.error(`[audio:prepare] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
