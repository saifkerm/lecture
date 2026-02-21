import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Dashboard } from "../components/Dashboard";

describe("Dashboard", () => {
  it("affiche les métriques principales", () => {
    render(
      <Dashboard
        phase="during"
        suggestedJuzId={3}
        ramadanDay={3}
        progress={{ done: 2, total: 30, percent: 7 }}
        streak={2}
        weekly={{ count: 2, target: 5, met: false }}
      />
    );

    expect(screen.getByText(/Jour 3/i)).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 30/i)).toBeInTheDocument();
    expect(screen.getByText(/2 jour\(s\)/i)).toBeInTheDocument();
  });
});
