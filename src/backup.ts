import { normalizeData } from "./store.ts";
import type { AppData } from "./types.ts";

const BACKUP_FORMAT = "wtrack-backup";

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  exportedAt: string;
  data: AppData;
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));

function hasValidProgress(value: unknown) {
  if (!isRecord(value)) return false;
  return Object.values(value).every((item) => {
    if (!isRecord(item)) return false;
    return typeof item.puzzleId === "string"
      && (item.kind === "word-search" || item.kind === "crossword" || item.kind === "word-grid")
      && Array.isArray(item.foundWordIds) && item.foundWordIds.every((id) => typeof id === "string")
      && Array.isArray(item.entries) && item.entries.every((entry) => typeof entry === "string")
      && (item.hintedCells === undefined || (Array.isArray(item.hintedCells) && item.hintedCells.every((entry) => Number.isInteger(entry) && entry >= 0)))
      && [item.elapsedSeconds, item.startedAt, item.updatedAt].every((field) => typeof field === "number")
      && (item.completedAt === null || typeof item.completedAt === "number");
  });
}

export function createBackup(data: AppData, now = new Date()) {
  const backup: BackupEnvelope = {
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    data,
  };
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export function parseBackup(contents: string) {
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error("This file is not valid JSON.");
  }

  if (!isRecord(value)) throw new Error("This is not a WTrack backup.");
  const envelope = value as Partial<BackupEnvelope>;
  if (envelope.format !== BACKUP_FORMAT || !isRecord(envelope.data)) {
    throw new Error("This is not a WTrack backup.");
  }
  if (envelope.data.version !== 1) throw new Error("This backup uses an unsupported WTrack data version.");
  if (!isRecord(envelope.data.preferences) || !hasValidProgress(envelope.data.progress) || !isRecord(envelope.data.deletedProgress)) {
    throw new Error("This WTrack backup is incomplete.");
  }
  return normalizeData(envelope.data);
}
