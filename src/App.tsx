import { Suspense } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes } from "react-router-dom";
import RemoteAppEntry from "./RemoteAppEntry.tsx";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-shell__header">
          <span className="app-shell__brand">Planning Poker · Dev Shell</span>
          <nav className="app-shell__nav" aria-label="Navegação do módulo">
            <Link className="app-shell__link" to="/planning-poker/">
              Home
            </Link>
          </nav>
        </header>

        <main className="app-shell__main">
          <Routes>
            <Route index element={<Navigate to="/planning-poker/" replace />} />
            <Route
              path="/planning-poker/*"
              element={
                <Suspense
                  fallback={<p className="app-shell__loading">Carregando módulo...</p>}
                >
                  <RemoteAppEntry />
                </Suspense>
              }
            />
          </Routes>
        </main>

        <footer className="app-shell__footer">
          Shell de desenvolvimento — em produção este módulo é consumido pelo
          portal-shell via Module Federation.
        </footer>
      </div>
    </BrowserRouter>
  );
}
