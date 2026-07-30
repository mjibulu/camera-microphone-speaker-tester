import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Tool } from "../tool/Tool";

type Theme = "light" | "dark";

function preferredTheme(): Theme {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function App() {
  const [theme, setTheme] = useState<Theme>(preferredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="site-title" href="./" aria-label="Camera, Microphone & Speaker Tester home">
          Camera, Microphone & Speaker Tester
        </a>
        <button
          className="icon-button"
          type="button"
          aria-label={`Use ${theme === "light" ? "dark" : "light"} theme`}
          onClick={() =>
            setTheme((current) => (current === "light" ? "dark" : "light"))
          }
        >
          {theme === "light" ? <Moon aria-hidden /> : <Sun aria-hidden />}
        </button>
      </header>

      <main>
        <section className="tool-introduction" aria-labelledby="tool-title">
          <p className="eyebrow">Browser-local utility</p>
          <h1 id="tool-title">Camera, Microphone & Speaker Tester</h1>
          <p>Test selected cameras, microphones, and speakers independently with live previews, input levels, sample playback, and stereo tones.</p>
        </section>

        <section className="tool-workspace" aria-label="Tool workspace">
          <Tool />
        </section>

        <details className="information-section">
          <summary>How to use this tool</summary>
          <div className="information-content">
            <ol>
            <li>{"Start only the device you want to test and approve its browser permission."}</li>
            <li>{"Watch the camera preview or microphone meter and replay the captured microphone sample."}</li>
            <li>{"Run the speaker channels as needed, then stop testing to release every active device."}</li>
            </ol>
          </div>
        </details>
      </main>

      <footer className="site-footer">
        <span>MIT licensed.</span>
        <a href="https://eburp.com/">Originally developed for eBURP</a>
      </footer>
    </div>
  );
}
