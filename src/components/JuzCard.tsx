import type { JuzLink, PlaybackMode } from "../types/app";

type JuzCardProps = {
  juz: JuzLink;
  isCompleted: boolean;
  completedAtISO?: string;
  isSuggested: boolean;
  isActive: boolean;
  hasResume: boolean;
  resumeLabel?: string;
  hasAudioError: boolean;
  playbackMode: PlaybackMode;
  onSelect: (juzId: number) => void;
  onResume: (juzId: number) => void;
  onComplete: (juzId: number, playbackMode: PlaybackMode) => void;
};

function toDisplayDate(iso?: string): string {
  if (!iso) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(iso));
}

export function JuzCard({
  juz,
  isCompleted,
  completedAtISO,
  isSuggested,
  isActive,
  hasResume,
  resumeLabel,
  hasAudioError,
  playbackMode,
  onSelect,
  onResume,
  onComplete,
}: JuzCardProps): JSX.Element {
  const canResume = !isCompleted && hasResume;

  let statusLabel = "prête";
  if (isCompleted) {
    statusLabel = "terminée";
  } else if (isActive) {
    statusLabel = "en cours";
  } else if (canResume) {
    statusLabel = "reprise disponible";
  }

  const primaryAction = canResume ? () => onResume(juz.id) : () => onSelect(juz.id);
  const primaryLabel = canResume
    ? `Reprendre${resumeLabel ? ` à ${resumeLabel}` : ""}`
    : isCompleted
      ? "Réécouter"
      : "Écouter";
  const primaryAriaLabel = canResume
    ? `Reprendre la partie ${juz.id} à ${resumeLabel ?? "la dernière position"}`
    : `Écouter la partie ${juz.id}`;

  return (
    <article className={`juz-card ${isCompleted ? "done" : "pending"}`} aria-label={juz.label}>
      <header className="juz-header">
        <h3>{juz.label}</h3>
        <div className="juz-tags">
          {isSuggested ? <span className="tag">Partie du jour</span> : null}
          {isActive ? <span className="tag tag-active">En cours</span> : null}
          {!isCompleted && hasResume ? <span className="tag tag-resume">Reprise dispo</span> : null}
        </div>
      </header>

      <p className="status-text">Statut: {statusLabel}</p>
      {completedAtISO ? <p className="completion-text">Validée le {toDisplayDate(completedAtISO)}</p> : null}
      {!isCompleted && hasResume && resumeLabel ? (
        <p className="resume-text">Reprise disponible à {resumeLabel}</p>
      ) : null}

      <div className="actions-row">
        <button
          type="button"
          className="btn btn-primary"
          onClick={primaryAction}
          aria-label={primaryAriaLabel}
        >
          {primaryLabel}
        </button>

        <div className="actions-secondary">
          {!isCompleted && canResume ? (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onSelect(juz.id)}
              aria-label={`Écouter la partie ${juz.id}`}
            >
              Depuis le début
            </button>
          ) : null}

          {!isCompleted ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onComplete(juz.id, playbackMode)}
              aria-label={`Marquer la partie ${juz.id} comme terminée`}
            >
              Marquer terminée
            </button>
          ) : (
            <span className="status-chip status-chip-done" aria-label={`Partie ${juz.id} terminée`}>
              Terminée
            </span>
          )}
        </div>
      </div>

      <p className="source-local" aria-label={`Source locale de la partie ${juz.id}`}>
        Audio local
      </p>

      {hasAudioError ? (
        <p className="audio-error">
          Lecture indisponible pour cette partie. Réessayez puis vérifiez le cache de l'application.
        </p>
      ) : null}
    </article>
  );
}
