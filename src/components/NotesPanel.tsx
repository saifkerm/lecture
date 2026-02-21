type NotesPanelProps = {
  todayKey: string;
  todayNote: string;
  notesByDate: Record<string, string>;
  onTodayNoteChange: (value: string) => void;
};

export function NotesPanel({
  todayKey,
  todayNote,
  notesByDate,
  onTodayNoteChange
}: NotesPanelProps): JSX.Element {
  const history = Object.entries(notesByDate)
    .filter(([, content]) => content.trim().length > 0)
    .sort((a, b) => b[0].localeCompare(a[0]));

  return (
    <section className="panel" aria-label="Notes">
      <h2>Notes du jour</h2>

      <label className="field">
        <span>Note pour le {todayKey}</span>
        <textarea
          value={todayNote}
          rows={4}
          placeholder="Ajoutez vos réflexions, objectifs ou points de concentration du jour..."
          onChange={(event) => onTodayNoteChange(event.target.value)}
        />
      </label>

      <h3>Historique des notes</h3>
      {history.length === 0 ? (
        <p className="empty-text">Aucune note enregistrée.</p>
      ) : (
        <ul className="notes-history">
          {history.map(([date, content]) => (
            <li key={date}>
              <strong>{date}</strong>
              <p>{content}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
