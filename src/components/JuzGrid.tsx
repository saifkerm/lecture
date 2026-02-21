import { juzLinks } from "../data/juzLinks";
import { formatPositionLabel, getResumeForJuz } from "../lib/audioProgress";
import { getLastCompletionISO } from "../lib/progress";
import type { AudioProgressState, PlaybackMode, RecitationLog } from "../types/app";
import { JuzCard } from "./JuzCard";

type JuzGridProps = {
  completedJuzIds: number[];
  logs: RecitationLog[];
  suggestedJuzId: number | null;
  activeJuzId: number | null;
  audioState: AudioProgressState;
  audioErrorJuzId: number | null;
  audioSession: "idle" | "loading" | "playing" | "paused" | "error";
  onSelectJuz: (juzId: number) => void;
  onResumeJuz: (juzId: number) => void;
  onComplete: (juzId: number, playbackMode: PlaybackMode) => void;
};

export function JuzGrid({
  completedJuzIds,
  logs,
  suggestedJuzId,
  activeJuzId,
  audioState,
  audioErrorJuzId,
  audioSession,
  onSelectJuz,
  onResumeJuz,
  onComplete
}: JuzGridProps): JSX.Element {
  const completedSet = new Set(completedJuzIds);

  return (
    <section className="juz-grid" aria-label="Liste des 30 parties">
      {juzLinks.map((juz) => {
        const resumeEntry = getResumeForJuz(audioState, juz.id);
        return (
          <JuzCard
            key={juz.id}
            juz={juz}
            isCompleted={completedSet.has(juz.id)}
            completedAtISO={getLastCompletionISO(logs, juz.id)}
            isSuggested={suggestedJuzId === juz.id}
            isActive={activeJuzId === juz.id}
            hasResume={Boolean(resumeEntry)}
            resumeLabel={resumeEntry ? formatPositionLabel(resumeEntry.positionSec) : undefined}
            hasAudioError={audioErrorJuzId === juz.id}
            playbackMode={activeJuzId === juz.id && audioSession !== "error" ? "in_app" : "external"}
            onSelect={onSelectJuz}
            onResume={onResumeJuz}
            onComplete={onComplete}
          />
        );
      })}
    </section>
  );
}
