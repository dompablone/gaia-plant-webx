import React from "react";
import { Outlet, NavLink } from "react-router-dom";

import { supabase } from "../lib/supabase.js";
import GAIA_ICON from "../assets/gaia-icon.png";

function Frame({ children }) {
  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center px-3 py-6">
      <div className="w-full max-w-md bg-neutral-50 border border-neutral-200 rounded-[28px] shadow-xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

export function PhoneFrameLayout({ children }) {
  return (
    <Frame>
      <div className="px-4 py-4">{children ?? <Outlet />}</div>
    </Frame>
  );
}

export default function Layout({ children }) {
  return (
    <>
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-neutral-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <NavLink to="/app" className="flex items-center gap-2">
            <img src={GAIA_ICON} alt="Gaia Plant" className="h-6 w-6" />
            <span className="text-sm font-semibold text-neutral-900">Gaia Plant</span>
          </NavLink>

       <div className="flex items-center justify-between gap-3 flex-nowrap">
            <NavLink
              to="/app/produtos"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-lg shadow-sm"
            >
              🛒
            </NavLink>

            <NavLink
              to="/app/perfil"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 bg-white text-lg shadow-sm"
            >
              👤
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
              className="rounded-full border border-emerald-600 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-4">
        {children ?? <Outlet />}
      </main>
    </>
  );
}