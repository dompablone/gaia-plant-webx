import React from "react";
import { NavLink, Outlet } from "react-router-dom";
import { supabase } from "../lib/supabase";
import GAIA_ICON from "../assets/gaia-icon.png";

export function PhoneFrameLayout() {
  return (
    <div className="min-h-screen bg-neutral-100 flex justify-center">
      <div className="w-full max-w-[430px] bg-neutral-50 border border-neutral-200 rounded-[28px] shadow-xl">
        <Outlet />
      </div>
    </div>
  );
}

export default function Layout() {
  return (
    <>
      <header className="sticky top-0 z-10 border-b bg-neutral-50 px-4 py-3">
        <NavLink to="/app" className="flex items-center gap-2">
          <img src={GAIA_ICON} alt="Gaia Plant" width={16} height={16} />
          <span className="font-semibold">Gaia Plant</span>
        </NavLink>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.assign("/login");
          }}
        >
          Sair
        </button>
      </header>

      <main className="px-4 py-4">
        <Outlet />
      </main>
    </>
  );
}