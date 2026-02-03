import { Outlet, Link } from "react-router-dom";
import { GAIA_ICON } from "../../lib/constants/ui.js";

// Reusa o CSS global do app onde estão as classes gaia-* (auth shell)
import "../../App.css";

export default function AuthLayout() {
  return (
    <div className="gaia-auth-shell">
      <div className="gaia-auth-grid">
        {/* LEFT (desktop only) */}
        <aside className="gaia-auth-left gaia-on-dark">
          <div className="gaia-auth-left-inner">
            <div className="gaia-auth-brand">
              <img src={GAIA_ICON} alt="Gaia Plant" className="gaia-auth-logo" />
              <div className="gaia-auth-brandname">Gaia Plant</div>
            </div>

            <h1 className="gaia-auth-title">
              Cannabis medicinal
              <br />
              com clareza e segurança.
            </h1>

            <p className="gaia-auth-subtitle">
              Conteúdos educativos, triagem guiada e um caminho simples até o seu acompanhamento —
              com foco em informação responsável e uso consciente.
            </p>

            <div className="gaia-auth-ctas">
              <Link to="/conteudos" className="gaia-btn gaia-btn-on-dark">
                Ver conteúdos
              </Link>

              <Link to="/criar-conta" className="gaia-btn gaia-btn-outline">
                Criar conta
              </Link>
            </div>

            <div className="gaia-auth-footnote">* Conteúdo educativo. Não substitui avaliação médica.</div>
          </div>
        </aside>

        {/* RIGHT (always) */}
        <main className="gaia-auth-right">
          {/* folhas animadas sutis */}
          <div className="gaia-leaf leaf-1" aria-hidden="true" />
          <div className="gaia-leaf leaf-2" aria-hidden="true" />
          <div className="gaia-leaf leaf-3" aria-hidden="true" />

          <div className="gaia-auth-cardWrap">
            {/* Mobile brand header */}
            <div className="gaia-auth-mobilebrand">
              <img src={GAIA_ICON} alt="Gaia Plant" className="gaia-auth-logo" />
              <div className="gaia-auth-brandname">Gaia Plant</div>
            </div>

            <div className="gaia-auth-card">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}