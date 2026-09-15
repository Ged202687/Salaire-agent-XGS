import React, { useRef } from "react";
import { C, POLICE_TEXTE, formaterFcfa } from "./theme.js";
import { echelle, graduations, montantCourt, useLargeur } from "./graphique-commun.js";

// Une colonne par mois. Des barres plutot qu'une courbe : ce sont des montants
// verses sur des periodes distinctes, pas une grandeur continue. La base reste a
// zero, ce qui est de toute facon obligatoire pour des barres.
export default function GraphiqueMasse({ points, moisSelectionne, etiquette }) {
  const conteneur = useRef(null);
  const largeurDisponible = useLargeur(conteneur);

  if (!points.length) return null;

  const largeur = Math.max(largeurDisponible || 640, 280);
  const compact = largeur < 460;
  const hauteur = compact ? 210 : 260;
  const marge = { haut: 28, droite: 12, bas: 30, gauche: compact ? 62 : 84 };
  const traceLargeur = largeur - marge.gauche - marge.droite;
  const traceHauteur = hauteur - marge.haut - marge.bas;

  const maximum = Math.max(...points.map((p) => p.valeur), 1);
  const { haut, pas } = echelle(maximum);
  const paliers = graduations(haut, pas);

  const pasColonne = traceLargeur / points.length;
  // Barre plafonnee a 24 px : on ne remplit jamais toute la case, l'air qui
  // reste fait partie du dessin.
  const largeurBarre = Math.min(pasColonne * 0.58, 24);
  const centre = (index) => marge.gauche + index * pasColonne + pasColonne / 2;
  const y = (valeur) => marge.haut + traceHauteur - (valeur / haut) * traceHauteur;

  const indexSelection = points.findIndex((p) => p.mois === moisSelectionne);
  // Sans mois choisi, c'est le plus gros mois qui porte l'etiquette : c'est
  // l'information qu'on cherche en regardant une masse salariale.
  const indexEtiquette =
    indexSelection !== -1
      ? indexSelection
      : points.reduce((meilleur, p, i) => (p.valeur > points[meilleur].valeur ? i : meilleur), 0);
  const rythme = compact && points.length > 6 ? 2 : 1;

  return (
    <div ref={conteneur} style={{ width: "100%" }}>
      <svg
        width={largeur}
        height={hauteur}
        style={{ display: "block", overflow: "visible", fontFamily: POLICE_TEXTE }}
        role="img"
        aria-label={etiquette || "Masse salariale par mois"}
      >
        {paliers.map((valeur) => (
          <g key={valeur}>
            <line
              x1={marge.gauche}
              y1={y(valeur)}
              x2={marge.gauche + traceLargeur}
              y2={y(valeur)}
              stroke={valeur === 0 ? C.borderSoft : C.border}
              strokeWidth="1"
            />
            <text
              x={marge.gauche - 8}
              y={y(valeur) + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill={C.mutedSoft}
            >
              {montantCourt(valeur)}
            </text>
          </g>
        ))}

        {points.map((p, i) => {
          const hauteurBarre = Math.max(traceHauteur - (y(p.valeur) - marge.haut), p.valeur > 0 ? 2 : 0);
          return (
            <g key={`${p.annee}-${p.mois}`}>
              {/* Sommet arrondi, pied carre sur la ligne de base. */}
              <path
                d={
                  `M${centre(i) - largeurBarre / 2},${marge.haut + traceHauteur} ` +
                  `v${-(hauteurBarre - 4)} q0,-4 4,-4 h${largeurBarre - 8} q4,0 4,4 ` +
                  `v${hauteurBarre - 4} Z`
                }
                fill={C.serie}
              />
              {/* Cible de survol sur toute la hauteur de la case. */}
              <rect
                x={centre(i) - pasColonne / 2}
                y={marge.haut}
                width={pasColonne}
                height={traceHauteur}
                fill="transparent"
              >
                <title>{`${p.libelle} : ${formaterFcfa(p.valeur)}${
                  p.effectif ? ` — ${p.effectif} agent${p.effectif > 1 ? "s" : ""}` : ""
                }`}</title>
              </rect>
            </g>
          );
        })}

        {/* Une seule etiquette chiffree : l'infobulle et le tableau portent le reste. */}
        <text
          x={centre(indexEtiquette)}
          y={y(points[indexEtiquette].valeur) - 10}
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill={C.ink}
        >
          {formaterFcfa(points[indexEtiquette].valeur)}
        </text>

        {points.map((p, i) =>
          i % rythme === 0 || i === points.length - 1 || i === indexSelection ? (
            <text
              key={`etiquette-${p.annee}-${p.mois}`}
              x={centre(i)}
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
