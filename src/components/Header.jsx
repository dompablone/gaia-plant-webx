import React from "react";

export default function Header() {
  return (
    <header style={styles.header}>
      <h1 style={styles.logo}>
        Gaia Plant
        <span style={styles.sub}>Cannabis Medicinal</span>
      </h1>
    </header>
  );
}

const styles = {
  header: {
    padding: "16px 24px",
    borderBottom: "1px solid #eee",
  },
  logo: {
    fontSize: 20,
    fontWeight: 800,
    margin: 0,
  },
  sub: {
    display: "block",
    fontSize: 12,
    fontWeight: 500,
    opacity: 0.6,
  },
};
