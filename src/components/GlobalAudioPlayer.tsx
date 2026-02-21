import { useCallback, useEffect, useRef } from "react";
import type { JuzLink } from "../types/app";
import { MIN_RESUME_SECONDS } from "../lib/audioProgress";

export type AudioSessionStatus = "idle" | "loading" | "playing" | "paused" | "error";

type GlobalAudioPlayerProps = {
  activeJuz: JuzLink | null;
  resumePositionSec: number | null;
  shouldAutoPlay: boolean;
  status: AudioSessionStatus;
  onClose: () => void;
  onTimeProgress: (juzId: number, positionSec: number, durationSec: number | null) => void;
  onEnded: (juzId: number) => void;
  onError: (juzId: number) => void;
  onReady: (juzId: number, durationSec: number | null) => void;
  onSessionChange: (status: AudioSessionStatus) => void;
};

function getDuration(audio: HTMLAudioElement): number | null {
  return Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : null;
}

function statusLabel(status: AudioSessionStatus): string {
  if (status === "loading") {
    return "Chargement";
  }
  if (status === "playing") {
    return "Lecture en cours";
  }
  if (status === "paused") {
    return "En pause";
  }
  if (status === "error") {
    return "Erreur de lecture";
  }
  return "Inactif";
}

export function GlobalAudioPlayer({
  activeJuz,
  resumePositionSec,
  shouldAutoPlay,
  status,
  onClose,
  onTimeProgress,
  onEnded,
  onError,
  onReady,
  onSessionChange
}: GlobalAudioPlayerProps): JSX.Element | null {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lastPersistedSecRef = useRef<number | null>(null);
  const pendingSeekSecRef = useRef<number | null>(null);
  const autoPlayAttemptedRef = useRef(false);

  const tryAutoPlay = useCallback(async (): Promise<void> => {
    if (!audioRef.current || !shouldAutoPlay || autoPlayAttemptedRef.current) {
      return;
    }

    autoPlayAttemptedRef.current = true;
    try {
      await audioRef.current.play();
    } catch {
      onSessionChange("paused");
    }
  }, [onSessionChange, shouldAutoPlay]);

  const persistProgress = useCallback(
    (minimumDeltaSec: number): void => {
      if (!activeJuz || !audioRef.current) {
        return;
      }

      const currentTime = Number.isFinite(audioRef.current.currentTime)
        ? Math.max(0, audioRef.current.currentTime)
        : 0;
      if (currentTime < MIN_RESUME_SECONDS) {
        return;
      }

      const previousTime = lastPersistedSecRef.current;
      if (previousTime !== null && Math.abs(currentTime - previousTime) < minimumDeltaSec) {
        return;
      }

      const durationSec = getDuration(audioRef.current);
      onTimeProgress(activeJuz.id, currentTime, durationSec);
      lastPersistedSecRef.current = currentTime;
    },
    [activeJuz, onTimeProgress]
  );

  useEffect(() => {
    if (!activeJuz) {
      lastPersistedSecRef.current = null;
      pendingSeekSecRef.current = null;
      onSessionChange("idle");
      return;
    }

    pendingSeekSecRef.current =
      resumePositionSec !== null && Number.isFinite(resumePositionSec) && resumePositionSec > 0
        ? Math.max(0, resumePositionSec)
        : null;
    lastPersistedSecRef.current = null;
    autoPlayAttemptedRef.current = false;
    onSessionChange("loading");

    if (audioRef.current && pendingSeekSecRef.current !== null && audioRef.current.readyState >= 1) {
      const durationSec = getDuration(audioRef.current);
      const maxSeek =
        durationSec === null ? pendingSeekSecRef.current : Math.max(durationSec - 0.5, 0);
      audioRef.current.currentTime = Math.min(pendingSeekSecRef.current, maxSeek);
      pendingSeekSecRef.current = null;
      onSessionChange("paused");
    }

    if (audioRef.current && shouldAutoPlay) {
      void tryAutoPlay();
    }
  }, [activeJuz, onSessionChange, resumePositionSec, shouldAutoPlay, tryAutoPlay]);

  useEffect(() => {
    if (!activeJuz || !audioRef.current) {
      return;
    }

    // Force metadata fetch on selection so the control bar does not stay at 0:00 / 0:00.
    audioRef.current.load();
    if (shouldAutoPlay) {
      void tryAutoPlay();
    }
  }, [activeJuz, shouldAutoPlay, tryAutoPlay]);

  useEffect(() => {
    if (!activeJuz) {
      return;
    }

    const flush = (): void => {
      persistProgress(1);
    };

    const onPageHide = (): void => {
      flush();
    };

    const onVisibilityChange = (): void => {
      if (document.hidden) {
        flush();
      }
    };

    window.addEventListener("pagehide", onPageHide);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [activeJuz, persistProgress]);

  useEffect(() => {
    if (!activeJuz || !audioRef.current || typeof navigator === "undefined") {
      return;
    }

    const mediaSession = navigator.mediaSession;
    if (!mediaSession) {
      return;
    }

    if (typeof window !== "undefined" && "MediaMetadata" in window) {
      mediaSession.metadata = new MediaMetadata({
        title: activeJuz.label,
        artist: "Ramadan",
        album: "Suivi Ramadan"
      });
    }

    const setActionHandler = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null
    ): void => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // Browser does not support this action.
      }
    };

    setActionHandler("play", async () => {
      try {
        await audioRef.current?.play();
      } catch {
        // Playback can fail without a user gesture.
      }
    });

    setActionHandler("pause", () => {
      audioRef.current?.pause();
    });

    setActionHandler("seekbackward", (details) => {
      if (!audioRef.current) {
        return;
      }
      const offset = details.seekOffset ?? 10;
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - offset);
      persistProgress(1);
    });

    setActionHandler("seekforward", (details) => {
      if (!audioRef.current) {
        return;
      }
      const offset = details.seekOffset ?? 10;
      const duration = getDuration(audioRef.current);
      const nextTime = audioRef.current.currentTime + offset;
      audioRef.current.currentTime = duration === null ? nextTime : Math.min(duration, nextTime);
      persistProgress(1);
    });

    setActionHandler("seekto", (details) => {
      if (!audioRef.current || !Number.isFinite(details.seekTime)) {
        return;
      }
      audioRef.current.currentTime = Math.max(0, details.seekTime ?? 0);
      persistProgress(1);
    });

    setActionHandler("stop", () => {
      if (!audioRef.current) {
        return;
      }
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      persistProgress(1);
      onClose();
    });

    return () => {
      setActionHandler("play", null);
      setActionHandler("pause", null);
      setActionHandler("seekbackward", null);
      setActionHandler("seekforward", null);
      setActionHandler("seekto", null);
      setActionHandler("stop", null);
      mediaSession.metadata = null;
    };
  }, [activeJuz, onClose, persistProgress]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.mediaSession) {
      return;
    }

    if (status === "playing") {
      navigator.mediaSession.playbackState = "playing";
      return;
    }

    if (status === "paused" || status === "loading") {
      navigator.mediaSession.playbackState = "paused";
      return;
    }

    navigator.mediaSession.playbackState = "none";
  }, [status]);

  if (!activeJuz) {
    return null;
  }

  return (
    <section className="global-audio-player" aria-label="Lecteur global">
      <div className="global-audio-head">
        <div>
          <p className="global-audio-kicker">Lecteur actif</p>
          <strong>{activeJuz.label}</strong>
          <p className="global-audio-status">Statut: {statusLabel(status)}</p>
        </div>
        <button type="button" className="btn btn-secondary btn-icon" onClick={onClose}>
          Fermer
        </button>
      </div>

      <audio
        key={activeJuz.id}
        ref={audioRef}
        controls
        autoPlay={shouldAutoPlay}
        preload="metadata"
        src={activeJuz.url}
        data-testid="global-audio"
        onLoadedMetadata={(event) => {
          const audio = event.currentTarget;
          const durationSec = getDuration(audio);

          if (pendingSeekSecRef.current !== null) {
            const maxSeek = durationSec === null ? pendingSeekSecRef.current : Math.max(durationSec - 0.5, 0);
            audio.currentTime = Math.min(pendingSeekSecRef.current, maxSeek);
            pendingSeekSecRef.current = null;
          }

          onReady(activeJuz.id, durationSec);
          if (shouldAutoPlay) {
            void tryAutoPlay();
          } else {
            onSessionChange("paused");
          }
        }}
        onCanPlay={() => {
          if (shouldAutoPlay) {
            void tryAutoPlay();
          }
        }}
        onTimeUpdate={() => {
          persistProgress(5);
        }}
        onPause={() => {
          onSessionChange("paused");
          persistProgress(1);
        }}
        onPlay={() => {
          onSessionChange("playing");
        }}
        onWaiting={() => {
          onSessionChange("loading");
        }}
        onEnded={() => {
          persistProgress(1);
          onEnded(activeJuz.id);
        }}
        onError={() => {
          onSessionChange("error");
          onError(activeJuz.id);
        }}
      >
        Votre navigateur ne supporte pas le lecteur audio intégré.
      </audio>

      {status === "error" ? (
        <p className="audio-error">
          Lecture intégrée indisponible pour cette partie. Utilisez{" "}
          <a href={activeJuz.url} target="_blank" rel="noreferrer">
            la source externe
          </a>
          .
        </p>
      ) : null}
    </section>
  );
}
