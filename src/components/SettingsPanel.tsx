import type { AppSettings } from "../types/app";

type SettingsPanelProps = {
  settings: AppSettings;
  notificationSupported: boolean;
  notificationPermission: NotificationPermission | "unsupported";
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  onAskNotificationPermission: () => void;
};

function permissionLabel(permission: SettingsPanelProps["notificationPermission"]): string {
  if (permission === "unsupported") {
    return "Notifications non supportées sur ce navigateur.";
  }

  if (permission === "granted") {
    return "Notifications autorisées.";
  }

  if (permission === "denied") {
    return "Notifications refusées.";
  }

  return "Permission de notification non demandée.";
}

export function SettingsPanel({
  settings,
  notificationSupported,
  notificationPermission,
  onSettingsChange,
  onAskNotificationPermission
}: SettingsPanelProps): JSX.Element {
  return (
    <section className="panel" aria-label="Paramètres">
      <h2>Paramètres</h2>

      <label className="field">
        <span>Date de début du Ramadan</span>
        <input
          type="date"
          value={settings.ramadanStartDateISO}
          onChange={(event) => onSettingsChange({ ramadanStartDateISO: event.target.value })}
        />
      </label>

      <label className="field">
        <span>Objectif hebdomadaire</span>
        <input
          type="number"
          min={1}
          max={30}
          value={settings.weeklyTarget}
          onChange={(event) =>
            onSettingsChange({
              weeklyTarget: Math.max(1, Math.min(30, Number(event.target.value) || 1))
            })
          }
        />
      </label>

      <label className="field field-inline">
        <input
          type="checkbox"
          checked={settings.reminderEnabled}
          onChange={(event) => onSettingsChange({ reminderEnabled: event.target.checked })}
        />
        <span>Activer rappel quotidien</span>
      </label>

      <label className="field">
        <span>Heure du rappel</span>
        <input
          type="time"
          value={settings.reminderTimeHHmm}
          onChange={(event) => onSettingsChange({ reminderTimeHHmm: event.target.value })}
          disabled={!settings.reminderEnabled}
        />
      </label>

      <p className="permission-text">{permissionLabel(notificationPermission)}</p>

      {notificationSupported && notificationPermission !== "granted" ? (
        <button type="button" className="btn btn-secondary" onClick={onAskNotificationPermission}>
          Autoriser les notifications
        </button>
      ) : null}
    </section>
  );
}
