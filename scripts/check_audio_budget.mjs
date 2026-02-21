import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const TOTAL_JUZ = 30;
const MAX_FILE_BYTES = 90 * 1024 * 1024;
const MAX_TOTAL_BYTES = 850 * 1024 * 1024;

function parseArg(name, fallback) {
  const prefix = `--${name}=`;
  const value = process.argv.find((arg) => arg.startsWith(prefix));
  if (!value) {
    return fallback;
  }
  return value.slice(prefix.length);
}

function bytesToMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function expectedFileName(juzId) {
  return `juz-${String(juzId).padStart(2, "0")}.mp3`;
}

function fail(message) {
  console.error(`[audio:check] ${message}`);
  process.exit(1);
}

const outputDir = path.resolve(process.cwd(), parseArg("output-dir", "public/audio"));

let files;
try {
  files = readdirSync(outputDir, { withFileTypes: true });
} catch (error) {
  fail(`Dossier introuvable: ${outputDir}`);
}

const mp3Files = files.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp3"));

if (mp3Files.length !== TOTAL_JUZ) {
  fail(`Nombre de fichiers MP3 invalide: ${mp3Files.length}. Attendu: ${TOTAL_JUZ}.`);
}

const expectedNames = new Set(Array.from({ length: TOTAL_JUZ }, (_, index) => expectedFileName(index + 1)));
for (const file of mp3Files) {
  if (!expectedNames.has(file.name)) {
    fail(`Nom de fichier invalide: ${file.name}. Attendu: juz-01.mp3 ... juz-30.mp3.`);
  }
}

let totalBytes = 0;
for (const file of mp3Files) {
  const absolute = path.join(outputDir, file.name);
  const size = statSync(absolute).size;
  totalBytes += size;

  if (size > MAX_FILE_BYTES) {
    fail(`Fichier trop volumineux: ${file.name} (${bytesToMb(size)} MB > 90 MB).`);
  }
}

if (totalBytes > MAX_TOTAL_BYTES) {
  fail(`Poids total trop élevé: ${bytesToMb(totalBytes)} MB > 850 MB.`);
}

console.log(
  `[audio:check] OK - ${mp3Files.length} fichiers MP3 valides, total ${bytesToMb(totalBytes)} MB.`
);
