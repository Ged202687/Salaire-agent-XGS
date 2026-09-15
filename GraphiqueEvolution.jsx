import React, { useEffect, useRef, useState } from "react";
import { C, POLICE_TEXTE, formaterFcfa } from "./theme.js";

// Le trace est dessine a la largeur reelle du conteneur plutot que mis a
// l'echelle depuis un viewBox fixe : sinon les etiquettes deviennent
// illisibles sur un telephone.
function useLargeur(reference) {
  const [largeur, setLargeur] = useState(0);

  useEffect(() => {
    const element = reference.current;
    if (!element) return undefined;

    const mesurer = () => setLargeur(element.getBoundingClientRect().width);
    mesurer();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", mesurer);
      return () => window.removeEventListener("resize", mesurer);
    }
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [reference]);

  return largeur;
}

// Des graduations rondes, et au plus cinq : 0 / 50 000 / 100 000 / 150 000 /
// 200 000 se lit, 0 / 45 500 / 91 000 non.
function echelle(maximum) {
  const candidats = [1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 500000];
  const pas = candidats.find((p) => maximum / p <= 4) || 1000000;
  return { haut: Math.max(Math.ceil(maximum / pas) * pas, pas), pas };
}

export default function GraphiqueEvolution({ points, moisSelectionne }) {
  const conteneur = useRef(null);
  const largeurDisponible = useLargeur(conteneur);

  // Une seule valeur ne fait pas une evolution.
  if (points.length < 2) return null;

  const largeur = Math.max(largeurDisponible || 640, 280);
  const compact = largeur < 420;
  const hauteur = compact ? 200 : 250;
  const marge = { haut: 26, droite: 14, bas: 30, gauche: compact ? 54 : 70 };
  const traceLargeur = largeur - marge.gauche - marge.droite;
  const traceHauteur = hauteur - marge.haut - marge.bas;

  const maximum = Math.max(...points.map((p) => p.valeur));
  const { haut, pas } = echelle(maximum);
  const graduations = [];
  for (let v = 0; v <= haut; v += pas) graduations.push(v);

  // Une seule serie : la base reste a zero. Un axe coupe transformerait
  // 20 000 FCFA d'ecart en envolee.
  // Les points extremes ne collent pas aux bords : sans ce retrait, le premier
  // se confond avec l'axe et le cercle du dernier depasse du trace.
  const retrait = 16;
  const x = (index) =>
    marge.gauche +
    retrait +
    (points.length === 1
      ? (traceLargeur - 2 * retrait) / 2
      : (index * (traceLargeur - 2 * retrait)) / (points.length - 1));
  const y = (valeur) => marge.haut + traceHauteur - (valeur / haut) * traceHauteur;

  const chemin = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.valeur)}`).join(" ");
  const aire =
    `M${x(0)},${marge.haut + traceHauteur} ` +
    points.map((p, i) => `L${x(i)},${y(p.valeur)}`).join(" ") +
    ` L${x(points.length - 1)},${marge.haut + traceHauteur} Z`;

  const indexSelection = points.findIndex((p) => p.mois === moisSelectionne);
  // Un mois sur deux suffit a se reperer quand la place manque, et on garde
  // toujours le premier, le dernier et le mois selectionne.
  const rythme = compact && points.length > 4 ? 2 : 1;

  return (
    <div ref={conteneur} style={{ width: "100%" }}>
      <svg
        width={largeur}
        height={hauteur}
        style={{ display: "block", overflow: "visible", fontFamily: POLICE_TEXTE }}
        role="img"
        aria-label="Évolution du total payé, mois par mois"
      >
        {graduations.map((valeur) => (
          <g key={valeur}>
            <line
              x1={marge.gauche}
              y1={y(valeur)}
              x2={marge.gauche + traceLargeur}
              y2={y(valeur)}
              stroke={C.border}
              strokeWidth="1"
            />
            <text
              x={marge.gauche - 8}
              y={y(valeur) + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill={C.mutedSoft}
            >
              {valeur.toLocaleString("fr-FR").replace(/ | /g, " ")}
            </text>
          </g>
        ))}

        {indexSelection !== -1 && (
          <line
            x1={x(indexSelection)}
            y1={marge.haut - 6}
            x2={x(indexSelection)}
            y2={marge.haut + traceHauteur}
            stroke={C.mutedSoft}
            strokeWidth="1"
          />
        )}

        <path d={aire} fill={C.serie} opacity="0.1" />
        <path
          d={chemin}
          fill="none"
          stroke={C.serie}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {points.map((p, i) => (
          <g key={`${p.annee}-${p.mois}`}>
            <circle
              cx={x(i)}
              cy={y(p.valeur)}
              r="4.5"
              fill={C.serie}
              stroke={C.surface}
              strokeWidth="2"
            />
            {/* Cible de survol plus large que le point lui-meme. */}
            <circle cx={x(i)} cy={y(p.valeur)} r="13" fill="transparent">
              <title>{`${p.libelle} : ${formaterFcfa(p.valeur)}`}</title>
            </circle>
          </g>
        ))}

        {/* Une seule etiquette chiffree, sur le mois selectionne : elle porte
            donc le meme montant que le chiffre principal de la page. */}
        {indexSelection !== -1 && (
          <text
            x={Math.min(
              Math.max(x(indexSelection), marge.gauche + 30),
              marge.gauche + traceLargeur - 30
            )}
            y={y(points[indexSelection].valeur) - 14}
            textAnchor="middle"
            fontSize="12.5"
            fontWeight="600"
            fill={C.ink}
          >
            {formaterFcfa(points[indexSelection].valeur)}
          </text>
        )}

        {points.map((p, i) =>
          i % rythme === 0 || i === points.length - 1 || i === indexSelection ? (
            <text
              key={`etiquette-${p.annee}-${p.mois}`}
              x={x(i)}
              y={marge.haut + traceHauteur + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight={i === indexSelection ? "600" : "400"}
              fill={i === indexSelection ? C.text : C.muted}
            >
              {p.libelle}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
