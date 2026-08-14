import { Suspense, useEffect, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import RemoteAppEntry from "./RemoteAppEntry.tsx";
import { Button } from "@/components/ui/button";

const THEME_KEY = "coelho-theme";

function useDevTheme() {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.querySelector(".app-shell")?.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  return { dark, toggle: () => setDark((current) => !current) };
}

export default function App() {
  const { dark, toggle } = useDevTheme();

  return (
    <BrowserRouter>
      <div className="app-shell flex min-h-svh flex-col bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4">
            <span className="text-base font-semibold">
              Planning Poker · Dev Shell
            </span>
            <nav className="flex items-center gap-2 text-sm" aria-label="Navegação do módulo">
              <Link
                to="/planning-poker/"
                className="rounded-md px-2 py-1 transition-colors hover:bg-accent"
              >
                Home
              </Link>
            </nav>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Alternar tema"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          <Routes>
            <Route index element={<Navigate to="/planning-poker/" replace />} />
            <Route
              path="/planning-poker/*"
              element={
                <Suspense
                  fallback={
                    <p className="p-6 text-center text-muted-foreground">
                      Carregando módulo...
                    </p>
                  }
                >
                  <RemoteAppEntry />
                </Suspense>
              }
            />
          </Routes>
        </main>

        <footer className="border-t border-border px-4 py-3 text-center text-sm text-muted-foreground">
          Shell de desenvolvimento — em produção este módulo é consumido pelo
          portal-shell via Module Federation.
        </footer>
      </div>
    </BrowserRouter>
  );
}
