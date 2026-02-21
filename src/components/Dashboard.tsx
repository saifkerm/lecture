import type { RamadanPhase } from "../types/app";

type DashboardProps = {
  phase: RamadanPhase;
  suggestedJuzId: number | null;
  ramadanDay: number | null;
  progress: { done: number; total: number; percent: number };
  streak: number;
  weekly: { count: number; target: number; met: boolean };
};

function phaseMessage(phase: RamadanPhase, ramadanDay: number | null, suggestedJuzId: number | null): string {
  if (phase === "before") {
    return "Ramadan n'a pas encore commencé. Ajustez la date de début si nécessaire.";
  }

  if (phase === "after") {
    return "Ramadan est terminé. Vous pouvez continuer à écouter librement les 30 parties.";
  }

  if (phase === "during" && ramadanDay && suggestedJuzId) {
    return `Aujourd'hui: Jour ${ramadanDay} - Partie recommandée: ${suggestedJuzId}.`;
  }

  return "Configurez votre date de début de Ramadan pour recevoir la recommandation du jour.";
}

export function Dashboard({
  phase,
  suggestedJuzId,
  ramadanDay,
  progress,
  streak,
  weekly
}: DashboardProps): JSX.Element {
  return (
    <section className="dashboard" aria-label="Tableau de bord de progression">
      <p className="daily-callout">{phaseMessage(phase, ramadanDay, suggestedJuzId)}</p>
      <div className="stats-grid">
        <article className="stat-card">
          <h2>Progression globale</h2>
          <p className="stat-main">{progress.done} / {progress.total}</p>
          <p>{progress.percent}% complété</p>
        </article>

        <article className="stat-card">
          <h2>Streak actuel</h2>
          <p className="stat-main">{streak} jour(s)</p>
          <p>Jours consécutifs avec récitation validée</p>
        </article>

        <article className={`stat-card ${weekly.met ? "success" : "warning"}`}>
          <h2>Objectif hebdomadaire</h2>
          <p className="stat-main">
            {weekly.count} / {weekly.target}
          </p>
          <p>{weekly.met ? "Objectif atteint" : "Encore un effort cette semaine"}</p>
        </article>
      </div>
    </section>
  );
}
