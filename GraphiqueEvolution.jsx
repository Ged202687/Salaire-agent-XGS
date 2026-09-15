import React, { useRef } from "react";
import { C, POLICE_CHIFFRE, POLICE_TEXTE, POLICE_TITRE, formaterFcfa } from "./theme.js";
import { echelle, graduations, montantCourt, useLargeur } from "./graphique-commun.js";

// Une seule serie, donc pas de legende : le titre de section dit ce qui est
// trace. La couleur vient de C.serie, validee sur la surface des cartes ; le
// jaune de marque n'entre jamais dans un trace.
export default function GraphiqueEvolution({ points, moisSelectionne }) {
  const conteneur = useRef(null);
  const largeurDisponible = useLargeur(conteneur);

  // Une seule valeur ne fait pas une evolution.
  if (points.length < 2) return null;

  const largeur = Math.max(largeurDisponible || 640, 280);
  const compact = largeur < 420;
  const hauteur = compact ? 210 : 262;
  const marge = { haut: 30, droite: 14, bas: 32, gauche: compact ? 56 : 74 };
  const traceLargeur = largeur - marge.gauche - marge.droite;
  const traceHauteur = hauteur - marge.haut - marge.bas;

  const maximum = Math.max(...points.map((p) => p.valeur));
  const { haut, pas } = echelle(maximum);
  const paliers = graduations(haut, pas);

  // La base reste a zero : un axe coupe transformerait 20 000 FCFA d'ecart en
  // envolee. Les points extremes ne collent pas aux bords, sinon le premier se
  // confond avec l'axe et le cercle du dernier depasse du trace.
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
  const rythme = compact && points.length > 4 ? 2 : 1;

  const hautPoint = indexSelection === -1 ? 0 : y(points[indexSelection].valeur);
  const yEtiquette = hautPoint - marge.haut < 22 ? marge.haut - 12 : hautPoint - 15;

  return (
    <div ref={conteneur} style={{ width: "100%" }}>
      <svg
        width={largeur}
        height={hauteur}
        style={{ display: "block", overflow: "visible", fontFamily: POLICE_TEXTE }}
        role="img"
        aria-label="Évolution du total payé, mois par mois"
      >
        <defs>
          <linearGradient id="lueurCourbe" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.serie} stopOpacity="0.32" />
            <stop offset="100%" stopColor={C.serie} stopOpacity="0" />
          </linearGradient>
        </defs>

        {paliers.map((valeur) => (
          <g key={valeur}>
            <line
              x1={marge.gauche}
              y1={y(valeur)}
              x2={marge.gauche + traceLargeur}
              y2={y(valeur)}
              stroke={C.grille}
              strokeWidth="1"
            />
            <text
              x={marge.gauche - 10}
              y={y(valeur) + 3.5}
              textAnchor="end"
              fontSize="10"
              fontFamily={POLICE_CHIFFRE}
              fill={C.encre3}
            >
              {montantCourt(valeur)}
            </text>
          </g>
        ))}

        {indexSelection !== -1 && (
          <line
            x1={x(indexSelection)}
            y1={marge.haut - 8}
            x2={x(indexSelection)}
            y2={marge.haut + traceHauteur}
            stroke={C.bordureVive}
            strokeWidth="1"
          />
        )}

        <path d={aire} fill="url(#lueurCourbe)" />
        <path
          d={chemin}
          fill="none"
          stroke={C.serie}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 7px rgba(57, 135, 229, 0.5))" }}
        />

        {points.map((p, i) => (
          <g key={`${p.annee}-${p.mois}`}>
            <circle
              cx={x(i)}
              cy={y(p.valeur)}
              r="4.5"
              fill={C.serie}
              stroke={C.carte}
              strokeWidth="2"
            />
            {/* Cible de survol plus large que le point lui-meme. */}
            <circle cx={x(i)} cy={y(p.valeur)} r="14" fill="transparent">
              <title>{`${p.libelle} : ${formaterFcfa(p.valeur)}`}</title>
            </circle>
          </g>
        ))}

        {/* Une seule etiquette chiffree, sur le mois selectionne : elle porte
            donc le meme montant que le chiffre principal de la page. */}
        {indexSelection !== -1 && (
          <text
            x={Math.min(
              Math.max(x(indexSelection), marge.gauche + 34),
              marge.gauche + traceLargeur - 34
            )}
            y={yEtiquette}
            textAnchor="middle"
            fontSize="12.5"
            fontFamily={POLICE_TITRE}
            fontWeight="600"
            fill={C.encre}
          >
            {formaterFcfa(points[indexSelection].valeur)}
          </text>
        )}

        {points.map((p, i) =>
          i % rythme === 0 || i === points.length - 1 || i === indexSelection ? (
            <text
              key={`etiquette-${p.annee}-${p.mois}`}
              x={x(i)}
              y={marge.haut + traceHauteur + 19}
              textAnchor="middle"
              fontSize="11"
              fontWeight={i === indexSelection ? "600" : "400"}
              fill={i === indexSelection ? C.encre : C.encre3}
            >
              {p.libelle}
            </text>
          ) : null
        )}
      </svg>
    </div>
  );
}
