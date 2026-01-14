import React from "react";
import { Routes, Route } from "react-router-dom";

function Home() {
  return <h1>Gaia Plant funcionando 🌱</h1>;
}

export default function RouterApp() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
  );
}
