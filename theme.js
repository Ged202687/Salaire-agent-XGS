// Palette et typographie reprises d'Aureo, pour que les deux outils se
// ressemblent. SERIE est la seule couleur ajoutee : c'est la teinte de la courbe
// d'evolution, et elle est validee sur surface blanche (bande de clarte,
// plancher de chroma, contraste >= 3:1). Le teal d'Aureo, lui, echoue au
// plancher de chroma et lirait gris sur un trace fin.
export const C = {
  ink: "#12161F",
  inkSoft: "#1C2330",
  canvas: "#F2F4F6",
  surface: "#FFFFFF",
  border: "#E1E5EA",
  borderSoft: "#ECEEF1",
  text: "#12161F",
  muted: "#63707F",
  mutedSoft: "#8894A3",
  amber: "#E0932B",
  amberSoft: "#FBF0DD",
  green: "#2E9B6B",
  greenSoft: "#E3F5EC",
  red: "#C6493F",
  redSoft: "#FBEAE8",
  serie: "#2A78D6",
};

export const FONTS =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";

export const POLICE_TITRE = '"Space Grotesk", system-ui, sans-serif';
export const POLICE_TEXTE = '"IBM Plex Sans", system-ui, sans-serif';

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
  return `${Math.round(nombre).toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}

export function estVide(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return true;
  return typeof valeur === "number" ? !Number.isFinite(valeur) : !Number.isFinite(Number(valeur));
}

export function nomDuMois(mois) {
  return MOIS_AFFICHE[mois - 1] || String(mois);
}
