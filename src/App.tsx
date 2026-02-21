import { useEffect, useMemo, useState } from "react";
import { Dashboard } from "./components/Dashboard";
import { GlobalAudioPlayer, type AudioSessionStatus } from "./components/GlobalAudioPlayer";
import { JuzGrid } from "./components/JuzGrid";
import { juzLinks } from "./data/juzLinks";
import { clearResumeEntry, getResumeForJuz, shouldAutoComplete, upsertResumeEntry } from "./lib/audioProgress";
import {
  computeProgress,
  computeStreak,
  computeWeeklyProgress,
  pickSuggestedJuzId,
  toLocalDateKey
} from "./lib/progress";
import { getCurrentRamadanDay, getCurrentRamadanPhase } from "./lib/ramadan";
import { loadState, saveState } from "./lib/storage";
import type { AppState, PlaybackMode, RecitationLog } from "./types/app";

function formatLogDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
}

export default function App(): JSX.Element {
  const [state, setState] = useState(() => loadState());
  const [activeJuzId, setActiveJuzId] = useState<number | null>(null);
  const [resumePositionSec, setResumePositionSec] = useState<number | null>(null);
  const [shouldAutoPlay, setShouldAutoPlay] = useState(false);
  const [audioSession, setAudioSession] = useState<AudioSessionStatus>("idle");
  const [audioErrorJuzId, setAudioErrorJuzId] = useState<number | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const now = new Date();

  const ramadanDay = getCurrentRamadanDay(now);
  const phase = getCurrentRamadanPhase(now);
  const suggestedJuzId = phase === "during" ? pickSuggestedJuzId(state.completedJuzIds) : null;

  const progress = computeProgress(state.completedJuzIds.length);
  const streak = computeStreak(state.logs, now);
  const weekly = computeWeeklyProgress(state.logs, now, state.settings.weeklyTarget);

  const recentLogs = useMemo(
    () =>
      [...state.logs]
        .sort((a, b) => new Date(b.completedAtISO).getTime() - new Date(a.completedAtISO).getTime())
        .slice(0, 15),
    [state.logs]
  );
  const activeJuz = useMemo(
    () => (activeJuzId ? juzLinks.find((juz) => juz.id === activeJuzId) ?? null : null),
    [activeJuzId]
  );

  function closeActivePlayer(): void {
    setActiveJuzId(null);
    setResumePositionSec(null);
    setShouldAutoPlay(false);
    setAudioSession("idle");
    setAudioErrorJuzId(null);
  }

  function applyCompletion(
    current: AppState,
    juzId: number,
    playbackMode: PlaybackMode
  ): AppState {
    const nowDate = new Date();
    const nowISO = nowDate.toISOString();
    const currentDay = toLocalDateKey(nowDate);

    const alreadyLoggedToday = current.logs.some(
      (entry) => entry.juzId === juzId && toLocalDateKey(entry.completedAtISO) === currentDay
    );

    const nextLogs: RecitationLog[] = alreadyLoggedToday
      ? current.logs
      : [...current.logs, { juzId, completedAtISO: nowISO, playbackMode }];

    const completedSet = new Set(current.completedJuzIds);
    completedSet.add(juzId);

    return {
      ...current,
      completedJuzIds: [...completedSet].sort((a, b) => a - b),
      logs: nextLogs,
      audio: clearResumeEntry(current.audio, juzId)
    };
  }

  function onSelectJuz(juzId: number): void {
    setActiveJuzId(juzId);
    setResumePositionSec(null);
    setShouldAutoPlay(true);
    setAudioSession("loading");
    setAudioErrorJuzId(null);
  }

  function onResumeJuz(juzId: number): void {
    const resumeEntry = getResumeForJuz(state.audio, juzId);
    setActiveJuzId(juzId);
    setResumePositionSec(resumeEntry?.positionSec ?? null);
    setShouldAutoPlay(true);
    setAudioSession("loading");
    setAudioErrorJuzId(null);
  }

  function onAudioProgress(juzId: number, positionSec: number, durationSec: number | null): void {
    const nextUpdatedAtISO = new Date().toISOString();
    const shouldComplete = shouldAutoComplete(positionSec, durationSec);

    setState((current) => {
      const nextAudio = upsertResumeEntry(current.audio, {
        juzId,
        positionSec,
        durationSec,
        updatedAtISO: nextUpdatedAtISO
      });

      const withAudio = {
        ...current,
        audio: nextAudio
      };

      if (shouldComplete) {
        return applyCompletion(withAudio, juzId, "in_app");
      }

      return withAudio;
    });

    if (shouldComplete && activeJuzId === juzId) {
      closeActivePlayer();
    }
  }

  function onAudioReady(juzId: number, durationSec: number | null): void {
    if (durationSec === null) {
      return;
    }

    setState((current) => {
      const existing = getResumeForJuz(current.audio, juzId);
      if (!existing) {
        return current;
      }

      return {
        ...current,
        audio: upsertResumeEntry(current.audio, {
          ...existing,
          durationSec,
          updatedAtISO: existing.updatedAtISO
        })
      };
    });
  }

  function onAudioEnded(juzId: number): void {
    setState((current) => applyCompletion(current, juzId, "in_app"));
    if (activeJuzId === juzId) {
      closeActivePlayer();
    }
  }

  function onAudioError(juzId: number): void {
    setAudioErrorJuzId(juzId);
    setAudioSession("error");
  }

  function onComplete(juzId: number, playbackMode: PlaybackMode): void {
    setState((current) => applyCompletion(current, juzId, playbackMode));

    if (activeJuzId === juzId) {
      closeActivePlayer();
    }
  }

  return (
    <main className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Suivi quotidien</p>
          <h1>30 Parties du Coran - Ramadan</h1>
          <p className="subtitle">
            Une application simple pour écouter, valider et suivre votre régularité pendant les 30 jours.
          </p>
        </div>
      </header>

      <Dashboard
        phase={phase}
        suggestedJuzId={suggestedJuzId}
        ramadanDay={ramadanDay}
        progress={progress}
        streak={streak}
        weekly={weekly}
      />

      <section className="panel history-panel" aria-label="Historique des récitations">
        <h2>Historique des récitations</h2>
        {recentLogs.length === 0 ? (
          <p className="empty-text">Aucune récitation validée pour le moment.</p>
        ) : (
          <ul className="recitation-history">
            {recentLogs.map((log, index) => (
              <li key={`${log.juzId}-${log.completedAtISO}-${index}`}>
                <strong>Partie {log.juzId}</strong>
                <span>{formatLogDate(log.completedAtISO)}</span>
                <em>{log.playbackMode === "in_app" ? "Lecteur intégré" : "Lien externe"}</em>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="list-heading" aria-label="Liste des parties">
        <h2>Mes parties</h2>
        <p>Touchez “Écouter” pour lancer immédiatement la partie, ou “Reprendre” pour reprendre plus tard.</p>
      </section>

      <JuzGrid
        completedJuzIds={state.completedJuzIds}
        logs={state.logs}
        suggestedJuzId={suggestedJuzId}
        activeJuzId={activeJuzId}
        audioState={state.audio}
        audioErrorJuzId={audioErrorJuzId}
        audioSession={audioSession}
        onSelectJuz={onSelectJuz}
        onResumeJuz={onResumeJuz}
        onComplete={onComplete}
      />

      <GlobalAudioPlayer
        activeJuz={activeJuz}
        resumePositionSec={resumePositionSec}
        shouldAutoPlay={shouldAutoPlay}
        status={audioSession}
        onClose={closeActivePlayer}
        onTimeProgress={onAudioProgress}
        onEnded={onAudioEnded}
        onError={onAudioError}
        onReady={onAudioReady}
        onSessionChange={setAudioSession}
      />
    </main>
  );
}
