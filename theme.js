// Identite visuelle : le bleu nuit XGS et le jaune soleil du logo, deja
// presents sur l'ecran de connexion, etendus a tout l'outil. Avant, la
// connexion etait nocturne et l'app basculait sur un gris clair : la rupture
// est supprimee.
//
// Une regle a ne pas franchir : le jaune est un accent d'INTERFACE (boutons,
// unites, reperes), jamais une couleur de DONNEE. Il echoue a la bande de
// clarte du validateur de palette, donc il mentirait sur un trace fin. La seule
// couleur de serie est SERIE, validee sur la surface des cartes (bande de
// clarte, plancher de chroma, contraste >= 3:1).
export const C = {
  // Les deux plans du fond, qui donnent la profondeur.
  nuit: "#03060F",
  nuitProfond: "#00040B",

  // Surfaces. CARTE est la surface de reference du validateur.
  carte: "#0B1224",
  carteHaute: "#121B33",
  verre: "rgba(255, 255, 255, 0.045)",
  verreHaut: "rgba(255, 255, 255, 0.07)",
  bordure: "rgba(255, 255, 255, 0.09)",
  bordureVive: "rgba(255, 255, 255, 0.18)",

  // Encres.
  encre: "#FFFFFF",
  encre2: "#AEB9CE",
  encre3: "#6E7A93",

  // Accent de marque.
  soleil: "#FDCF4F",
  soleilDoux: "rgba(253, 207, 79, 0.14)",

  // Donnee.
  serie: "#3987E5",
  serieDoux: "rgba(57, 135, 229, 0.18)",
  grille: "rgba(255, 255, 255, 0.07)",

  // Etats. La fleche et le signe portent le sens ; la couleur le confirme.
  hausse: "#4FD48C",
  hausseDoux: "rgba(79, 212, 140, 0.13)",
  baisse: "#FF8173",
  baisseDoux: "rgba(255, 129, 115, 0.13)",
  alerte: "#FFC14D",
  alerteDoux: "rgba(255, 193, 77, 0.13)",
};

export const FONTS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const POLICE_TITRE = '"Space Grotesk", system-ui, sans-serif';
export const POLICE_TEXTE = '"IBM Plex Sans", system-ui, sans-serif';
export const POLICE_CHIFFRE = '"IBM Plex Mono", ui-monospace, monospace';

// Le fond de page, repris de l'ecran de connexion pour que l'entree dans
// l'outil ne change pas de monde.
export const FOND_NUIT =
  `radial-gradient(1100px 620px at 14% -8%, #1B2559 0%, rgba(27, 37, 89, 0) 62%),` +
  `radial-gradient(900px 520px at 88% 4%, #123A6B 0%, rgba(18, 58, 107, 0) 58%),` +
  `linear-gradient(180deg, ${C.nuit} 0%, ${C.nuitProfond} 100%)`;

// --- briques de style partagees -------------------------------------------
export const carteVerre = {
  background: C.verre,
  border: `1px solid ${C.bordure}`,
  borderRadius: 20,
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

export const tuileVerre = {
  background: C.verre,
  border: `1px solid ${C.bordure}`,
  borderRadius: 14,
  padding: "13px 15px",
};

export const boutonFantome = {
  display: "inline-flex",
  alignItems: "center",
  gap: 7,
  background: "transparent",
  border: `1px solid ${C.bordure}`,
  borderRadius: 11,
  padding: "8px 13px",
  fontSize: 12.5,
  color: C.encre2,
  transition: "border-color .15s ease, color .15s ease, background .15s ease",
};

export const boutonSoleil = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  background: C.soleil,
  border: "none",
  borderRadius: 12,
  padding: "12px 18px",
  fontSize: 13.5,
  fontWeight: 600,
  color: "#0A0A0A",
};

export const selectSombre = {
  background: C.carteHaute,
  border: `1px solid ${C.bordure}`,
  borderRadius: 11,
  padding: "9px 12px",
  fontSize: 13.5,
  color: C.encre,
  outline: "none",
  minWidth: 132,
  maxWidth: 240,
};

export const etiquetteChamp = {
  fontSize: 10.5,
  fontWeight: 600,
  letterSpacing: "0.09em",
  textTransform: "uppercase",
  color: C.encre3,
  marginBottom: 6,
};

export const titreSection = {
  fontFamily: POLICE_TITRE,
  fontSize: 15.5,
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: C.encre,
};

// Le filet lumineux en haut d'une carte : un seul par ecran, sur la carte du
// chiffre principal, pour la distinguer sans crier.
export const filetLumineux = {
  position: "absolute",
  top: 0,
  left: 24,
  right: 24,
  height: 1,
  background: `linear-gradient(90deg, transparent, ${C.soleil}, transparent)`,
  opacity: 0.55,
};

export const MOIS_FR = [
  "janvier",
  "fevrier",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "aout",
  "septembre",
  "octobre",
  "novembre",
  "decembre",
];

export const MOIS_AFFICHE = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

export function sansAccent(texte) {
  if (typeof texte !== "string") return "";
  return texte
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Un montant absent (cellule vide du classeur, colonne inexistante) s'affiche
// "-" et jamais 0 : les deux ne disent pas la meme chose a un agent.
export function formaterFcfa(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return "-";
  const nombre = typeof valeur === "number" ? valeur : Number(valeur);
  if (!Number.isFinite(nombre)) return "-";
  return `${montantSeul(nombre)} FCFA`;
}

// Le montant sans son unite, pour les cas ou l'unite est composee a part.
export function montantSeul(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return "-";
  const nombre = typeof valeur === "number" ? valeur : Number(valeur);
  if (!Number.isFinite(nombre)) return "-";
  return Math.round(nombre).toLocaleString("fr-FR").replace(/ | /g, " ");
}

export function estVide(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return true;
  return typeof valeur === "number" ? !Number.isFinite(valeur) : !Number.isFinite(Number(valeur));
}

export function nomDuMois(mois) {
  return MOIS_AFFICHE[mois - 1] || String(mois);
}
