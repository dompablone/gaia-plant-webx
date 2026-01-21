import { Outlet, NavLink } from "react-router-dom";

import { supabase } from "../lib/supabase.js";

export default function Layout({ children }) {
  const linkClass = ({ isActive }) =>
    [
      "shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition",
      isActive
        ? "bg-emerald-600 text-white"
        : "text-neutral-700 hover:bg-neutral-200/70 hover:text-neutral-900",
    ].join(" ");

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-md px-4">
        <header className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between">
            <NavLink to="/app" className="flex items-center gap-2">
              <img src="/gaia-icon.png" alt="Gaia Plant" className="h-8 w-8" />
              <span className="text-base font-semibold text-neutral-900">Gaia</span>
            </NavLink>

            <div className="flex items-center gap-2">
              <NavLink
                to="/app/produtos"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-300 bg-white text-lg text-neutral-900 shadow-sm"
                aria-label="Carrinho"
                title="Carrinho"
              >
                🛒
              </NavLink>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut();
                  } finally {
                    window.location.assign("/login");
                  }
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-emerald-600 bg-white text-emerald-700 shadow-sm"
                aria-label="Sair"
                title="Sair"
              >
                ⎋
              </button>
            </div>
          </div>
        </header>

        <main className="py-4">{children ?? <Outlet />}</main>
      </div>
    </div>
  );
}
