import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { IntlProvider, type AbstractIntlMessages } from "use-intl";
import { Tool } from "../tool/Tool";
import messages from "../tool/messages.json";

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
          <p>Test selected cameras, microphones, and speakers with live previews, input levels, sample playback, and stereo tones.</p>
        </section>

        <section className="tool-workspace" aria-label="Tool workspace">
          <IntlProvider
            locale="en"
            messages={messages as unknown as AbstractIntlMessages}
          >
            <Tool />
          </IntlProvider>
        </section>

        <details className="information-section">
          <summary>How to use this tool</summary>
          <div className="information-content">
            <ol>
            <li>{"Open the Camera, Microphone, or Speakers panel for the hardware you want to check."}</li>
            <li>{"Start the camera or microphone and approve only the permission requested by the browser."}</li>
            <li>{"Select a device, then watch the camera preview or microphone level and replay the automatically recorded sample."}</li>
            <li>{"Choose an output device when available and play the left, stereo, and right test tones."}</li>
            <li>{"Stop each test individually or use Stop all hardware to release every active device."}</li>
            </ol>
          </div>
        </details>
      </main>

      <footer className="site-footer">
        <span>Open-source software under the MIT Licence.</span>
        <span>
          Created by Mujeeb for{" "}
          <a href="https://eburp.com/">eBURP</a>.
        </span>
      </footer>
    </div>
  );
}
