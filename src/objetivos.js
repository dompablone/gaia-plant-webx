import React from "react";

export const OBJETIVOS_MAIS_PROCURADOS = [
  { id: "sono", titulo: "Melhora do Sono", descricao: "Ajuda para dormir melhor e manter o descanso." },
  { id: "calma", titulo: "Mais Calma", descricao: "Controle da agitação e do nervosismo diário." },
  { id: "foco", titulo: "Aumento do Foco", descricao: "Mais concentração nas suas atividades." },
  { id: "estresse", titulo: "Menos Estresse", descricao: "Melhora do stress e da exaustão diária." },
  { id: "ansiedade", titulo: "Controle da Ansiedade", descricao: "Busca por mais equilíbrio emocional." },
  { id: "dor_cronica", titulo: "Dor Crônica", descricao: "Alívio de dores constantes." },
  { id: "esporte", titulo: "Melhora no Esporte", descricao: "Mais energia e menos fadiga muscular." },
  { id: "libido", titulo: "Aumento da Libido", descricao: "Recupere a sensação de prazer." },
  { id: "enxaqueca", titulo: "Enxaqueca", descricao: "Alívio para dores de cabeça fortes." },
  { id: "tpm", titulo: "Controle da TPM", descricao: "Controle para mudanças de humor e irritação." },
];

export function ObjetivosGrid({ value, onChange }) {
  return (
    <div style={styles.grid}>
      {OBJETIVOS_MAIS_PROCURADOS.map((item) => {
        const selected = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={{
              ...styles.card,
              ...(selected ? styles.cardSelected : {}),
            }}
            aria-pressed={selected}
          >
            <div style={styles.title}>{item.titulo}</div>
            <div style={styles.desc}>{item.descricao}</div>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },
  card: {
    textAlign: "left",
    border: "2px solid #111",
    borderRadius: 14,
    padding: 16,
    background: "#fff",
    cursor: "pointer",
  },
  cardSelected: {
    border: "2px solid #2ecc71",
    boxShadow: "0 0 0 2px rgba(46,204,113,0.2)",
  },
  title: {
    fontWeight: 800,
    fontSize: 20,
    lineHeight: 1.1,
    marginBottom: 10,
  },
  desc: {
    fontSize: 14,
    lineHeight: 1.35,
    opacity: 0.85,
  },
};
