export type PlaybackMode = "in_app" | "external";

export type JuzLink = {
  id: number;
  label: string;
  url: string;
};

export type RecitationLog = {
  juzId: number;
  completedAtISO: string;
  playbackMode: PlaybackMode;
};

export type AppSettings = {
  ramadanStartDateISO: string;
  weeklyTarget: number;
  reminderTimeHHmm: string;
  reminderEnabled: boolean;
};

export type AudioResumeEntry = {
  juzId: number;
  positionSec: number;
  durationSec: number | null;
  updatedAtISO: string;
};

export type AudioProgressState = {
  byJuzId: Record<number, AudioResumeEntry>;
  lastPlayedJuzId: number | null;
};

export type AppState = {
  version: 2;
  completedJuzIds: number[];
  logs: RecitationLog[];
  notesByDate: Record<string, string>;
  settings: AppSettings;
  audio: AudioProgressState;
};

export type RamadanPhase = "before" | "during" | "after" | "unknown";
