// Identite visuelle : le bleu nuit XGS et le jaune soleil du logo, communs au
// portail et aux autres outils (Aureo, Meridien, Horizon). Mon Salaire reste
// sur fond sombre, comme le portail ; Poppins pour les titres, Inter pour le
// texte et les montants (chiffres a chasse fixe, voir STYLE_GLOBAL).
//
// Une regle a ne pas franchir : le jaune est un accent d'INTERFACE (boutons,
// unites, reperes), jamais une couleur de DONNEE. Il echoue a la bande de
// clarte du validateur de palette, donc il mentirait sur un trace fin. La seule
// couleur de serie est SERIE, validee sur la surface des cartes (bande de
// clarte, plancher de chroma, contraste >= 3:1).
export const C = {
  // Les deux plans du fond, qui donnent la profondeur : le bleu nuit du logo
  // et sa version profonde, ceux du portail.
  nuit: "#000B53",
  nuitProfond: "#00052E",
  nuitClaire: "#0B1766",

  // Surfaces. CARTE est la surface de reference du validateur : c'est la
  // couleur effective d'une carte, soit le fond de page plus le voile de VERRE.
  carte: "#0D175C",
  carteHaute: "#162062",
  verre: "rgba(255, 255, 255, 0.05)",
  verreHaut: "rgba(255, 255, 255, 0.085)",
  bordure: "rgba(255, 255, 255, 0.12)",
  bordureVive: "rgba(255, 255, 255, 0.22)",

  // Encres : les lavandes du portail. ENCRE3 garde plus de 5:1 sur CARTE,
  // au-dessus du seuil du petit texte.
  encre: "#FFFFFF",
  encre2: "#C7CBEB",
  encre3: "#9096C0",

  // Accent de marque.
  soleil: "#FDCF4F",
  soleilDoux: "rgba(253, 207, 79, 0.14)",
  soleilTrait: "rgba(253, 207, 79, 0.35)",

  // Donnee.
  serie: "#3987E5",
  serieDoux: "rgba(57, 135, 229, 0.18)",
  grille: "rgba(255, 255, 255, 0.11)",

  // Etats. La fleche et le signe portent le sens ; la couleur le confirme.
  hausse: "#4FD48C",
  hausseDoux: "rgba(79, 212, 140, 0.13)",
  baisse: "#FF8173",
  baisseDoux: "rgba(255, 129, 115, 0.13)",
  alerte: "#FFC14D",
  alerteDoux: "rgba(255, 193, 77, 0.13)",
};

// Polices chargees une seule fois, par index.html.
export const POLICE_TITRE = '"Poppins", system-ui, sans-serif';
export const POLICE_TEXTE = '"Inter", system-ui, sans-serif';
export const POLICE_CHIFFRE = '"Inter", system-ui, sans-serif';

// Le fond de page, repris de l'ecran de connexion pour que l'entree dans
// l'outil ne change pas de monde.
export const FOND_NUIT =
  `radial-gradient(1000px 600px at 12% -10%, ${C.nuitClaire} 0%, rgba(11, 23, 102, 0) 65%),` +
  `radial-gradient(700px 420px at 92% 0%, rgba(253, 207, 79, 0.05) 0%, rgba(253, 207, 79, 0) 60%),` +
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
  padding: "9px 13px",
  fontSize: 12.5,
  color: C.encre2,
  transition: "border-color .15s ease-out, color .15s ease-out, background-color .15s ease-out",
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
  color: C.nuit,
  transition: "background-color .15s ease-out, transform .15s ease-out",
};

export const selectSombre = {
  background: C.carteHaute,
  border: `1px solid ${C.bordure}`,
  borderRadius: 11,
  padding: "9px 12px",
  fontSize: 13.5,
  color: C.encre,
  minWidth: 132,
  maxWidth: 240,
};

export const etiquetteChamp = {
  fontSize: 11,
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
