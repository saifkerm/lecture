import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "../App";
import { loadState } from "../lib/storage";

function setAudioMetrics(audio: HTMLElement, currentTime: number, duration: number): void {
  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    writable: true,
    value: currentTime
  });
  Object.defineProperty(audio, "duration", {
    configurable: true,
    writable: true,
    value: duration
  });
}

describe("App integration", () => {
  it("lance la lecture automatiquement quand on clique sur Écouter", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 1$/i }));
    const playMock = HTMLMediaElement.prototype.play as unknown as { mock: { calls: unknown[][] } };
    expect(playMock.mock.calls.length).toBeGreaterThan(0);
  });

  it("lance la lecture automatiquement quand on clique sur Reprendre", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 1$/i }));
    const audio = screen.getByTestId("global-audio");
    setAudioMetrics(audio, 80, 300);
    fireEvent.timeUpdate(audio);

    const playMock = HTMLMediaElement.prototype.play as unknown as { mock: { calls: unknown[][] } };
    const beforeResumeCalls = playMock.mock.calls.length;

    await user.click(screen.getByRole("button", { name: /Reprendre la partie 1/i }));
    expect(playMock.mock.calls.length).toBeGreaterThan(beforeResumeCalls);
  });

  it("met à jour la progression après validation d'une partie", async () => {
    const user = userEvent.setup();
    render(<App />);

    const completeButton = screen.getByRole("button", {
      name: /Marquer la partie 1 comme terminée/i
    });

    await user.click(completeButton);

    expect(screen.getByText(/1 \/ 30/i)).toBeInTheDocument();
  });

  it("propose une reprise explicite et la conserve après reload", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    const playButton = screen.getByRole("button", { name: /^Écouter la partie 1$/i });
    await user.click(playButton);

    const audio = screen.getByTestId("global-audio");
    expect(audio).toHaveAttribute("preload", "metadata");
    setAudioMetrics(audio, 75, 300);
    fireEvent.timeUpdate(audio);

    const resumeButton = screen.getByRole("button", { name: /Reprendre la partie 1 à 01:15/i });
    expect(resumeButton).toBeInTheDocument();

    unmount();
    render(<App />);
    const persistedResumeButton = screen.getByRole("button", { name: /Reprendre la partie 1 à 01:15/i });
    expect(persistedResumeButton).toBeInTheDocument();

    await user.click(persistedResumeButton);
    const resumedAudio = screen.getByTestId("global-audio") as HTMLAudioElement;
    setAudioMetrics(resumedAudio, 0, 300);
    fireEvent.loadedMetadata(resumedAudio);

    expect(resumedAudio.currentTime).toBeCloseTo(75, 0);
  });

  it("ne propose pas de reprise pour une progression trop courte", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 6$/i }));
    const audio = screen.getByTestId("global-audio");
    setAudioMetrics(audio, 1.2, 300);
    fireEvent.timeUpdate(audio);

    expect(screen.queryByRole("button", { name: /Reprendre la partie 6/i })).not.toBeInTheDocument();
  });

  it("auto-valide la partie quand la progression atteint 95%", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 1$/i }));
    const audio = screen.getByTestId("global-audio");

    setAudioMetrics(audio, 95, 100);
    fireEvent.timeUpdate(audio);

    expect(screen.getByText(/1 \/ 30/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reprendre la partie 1/i })).not.toBeInTheDocument();
  });

  it("auto-valide la partie à la fin de lecture (ended)", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 4$/i }));
    const audio = screen.getByTestId("global-audio");
    fireEvent.ended(audio);

    expect(screen.getByText(/1 \/ 30/i)).toBeInTheDocument();
    expect(loadState().audio.byJuzId[4]).toBeUndefined();
  });

  it("supprime la reprise après complétion manuelle", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 2$/i }));
    const audio = screen.getByTestId("global-audio");

    setAudioMetrics(audio, 31, 300);
    fireEvent.timeUpdate(audio);
    expect(screen.getByRole("button", { name: /Reprendre la partie 2/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Marquer la partie 2 comme terminée$/i }));
    expect(loadState().audio.byJuzId[2]).toBeUndefined();
  });

  it("affiche le fallback en erreur et ne crée pas de reprise en mode externe", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /^Écouter la partie 3$/i }));
    const audio = screen.getByTestId("global-audio");
    fireEvent.error(audio);

    expect(screen.getAllByText(/Lecture intégrée indisponible/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("link", { name: /^Ouvrir la source de la partie 3$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Marquer la partie 3 comme terminée$/i }));
    expect(loadState().audio.byJuzId[3]).toBeUndefined();
  });

  it("affiche la section mobile-first des parties", () => {
    render(<App />);

    expect(screen.getByRole("heading", { name: /Mes parties/i })).toBeInTheDocument();
    expect(screen.getByText(/Touchez “Écouter”/i)).toBeInTheDocument();
  });
});
