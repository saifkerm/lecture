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
  let statusLabel = "à faire";
  if (isCompleted) {
    statusLabel = "terminée";
  } else if (isActive) {
    statusLabel = "en cours";
  }

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
          onClick={() => onSelect(juz.id)}
          aria-label={`Écouter la partie ${juz.id}`}
        >
          Écouter
        </button>

        {!isCompleted && hasResume ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onResume(juz.id)}
            aria-label={`Reprendre la partie ${juz.id} à ${resumeLabel ?? "la dernière position"}`}
          >
            Reprendre {resumeLabel ? `à ${resumeLabel}` : ""}
          </button>
        ) : null}

        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => onComplete(juz.id, playbackMode)}
          disabled={isCompleted}
          aria-label={`Marquer la partie ${juz.id} comme terminée`}
        >
          {isCompleted ? "Déjà terminée" : "Marquer terminée"}
        </button>
      </div>

      <a
        href={juz.url}
        className="source-link"
        target="_blank"
        rel="noreferrer"
        aria-label={`Ouvrir la source de la partie ${juz.id}`}
      >
        Ouvrir la source
      </a>

      {hasAudioError ? (
        <p className="audio-error">
          Lecture intégrée indisponible pour cette partie. Utilisez le lien externe ci-dessus.
        </p>
      ) : null}
    </article>
  );
}
