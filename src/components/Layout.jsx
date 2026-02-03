import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
// ... other imports

// Inside the component rendering Meu histórico > Favoritos section:

{favorites.map((id) => (
  <div
    key={id}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: 12,
      borderRadius: 14,
      border: "1px solid rgba(15,23,42,0.12)",
      background: "#fff",
    }}
  >
    <div style={{ fontWeight: 800 }}>{id}</div>
    <button
      type="button"
      className="gaia-btn gaia-btn-ghost"
      style={{ width: 44, height: 44, minWidth: 44, borderRadius: 999, padding: 0, fontSize: 18 }}
      aria-label="Remover dos favoritos"
      title="Remover dos favoritos"
      onClick={() => {
        toggleFavorite(id);
        window.dispatchEvent(new Event("gaia:favorites"));
      }}
    >
      ★
    </button>
  </div>
))}

{/* Continue with the rest of the JSX normally, e.g.: */}
<Link to="/app/produtos" className="gaia-btn gaia-btn-primary" style={{ marginTop: 12 }}>
  Ver produtos
</Link>
