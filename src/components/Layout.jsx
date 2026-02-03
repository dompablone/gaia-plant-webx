import React from "react";
import { Link, Outlet } from "react-router-dom";

/**
 * App shell (header + centered container) for authenticated/app routes.
 * Use as a Route element: <Route element={<Layout/>}> ... </Route>
 */
export default function Layout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              G
            </span>
            <span>Gaia Plant</span>
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            <Link to="/app" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
              Início
            </Link>
            <Link to="/app/perfil" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
              Perfil
            </Link>
            <Link to="/app/conteudos" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
              Conteúdos
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

/**
 * Optional: phone-frame wrapper for routes that should render inside a mobile frame.
 * Use as: <Route element={<PhoneFrameLayout/>}> ... </Route>
 */
export function PhoneFrameLayout() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto w-full max-w-[430px] overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow">
        <Outlet />
      </div>
    </div>
  );
}