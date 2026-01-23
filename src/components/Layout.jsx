import { Outlet, NavLink } from "react-router-dom";

import { supabase } from "../lib/supabase.js";
import GAIA_ICON from "../assets/gaia-icon.png";

// Wrapper usado para forçar o app inteiro em “tamanho de telefone” mesmo no desktop
export function PhoneFrameLayout({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-md px-4">{children}</div>
    </div>
  );
}

function PhoneFrame({ children }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="mx-auto w-full max-w-md px-4">{children ?? <Outlet />}</div>
    </div>
  );
}

export default function Layout({ children }) {
  return (
    <PhoneFrame>
      <header className="sticky top-0 z-10 -mx-4 border-b border-neutral-200 bg-neutral-50/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <NavLink to="/app" className="flex items-center gap-2">
            <img src={GAIA_ICON} alt="Gaia Plant" className="h-7 w-7" />
            <span className="text-sm font-semibold text-neutral-900">Gaia Plant</span>
          </NavLink>

          <div className="flex items-center gap-2">
            <NavLink
              to="/app/produtos"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-neutral-300 bg-white text-3xl text-neutral-900 shadow-sm"
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
              className="rounded-full border-2 border-emerald-600 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm"
              aria-label="Sair"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="py-4">{children ?? <Outlet />}</main>
    </PhoneFrame>
  );
}
