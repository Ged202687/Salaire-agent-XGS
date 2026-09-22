// Fabrique le bulletin de prime de stage telecharge par l'agent. Texte vectoriel
// et selectionnable, pas une capture d'ecran : c'est une piece qu'on presente, et
// elle doit pouvoir etre lue et copiee.
//
// Le pied porte, en gras et avant tout le reste, la mention qui qualifie la
// piece : etablie a titre informatif, elle ne constitue pas un document officiel.
//
// Le document ne porte que le mois demande. L'historique de l'annee y figurait,
// il en a ete retire : un bulletin atteste d'un mois, et rien d'autre.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { MOIS_AFFICHE, montantSeul } from "./theme.js";

// A4 en points.
const PAGE = { largeur: 595.28, hauteur: 841.89 };
const MARGE = 48;

// Les couleurs de l'ecran ne conviennent pas au papier : le fond est blanc, les
// encres doivent etre lisibles a l'impression en noir et blanc.
const ENCRE = rgb(0.06, 0.08, 0.12);
const ENCRE_DOUCE = rgb(0.42, 0.46, 0.53);
const FILET = rgb(0.85, 0.87, 0.9);
const BANDE = rgb(0.965, 0.97, 0.98);
const NUIT = rgb(0.04, 0.07, 0.16);

// Helvetica est encode en WinAnsi : les accents francais passent, le reste non.
// Plutot que de laisser pdf-lib lever une exception sur un nom exotique, on
// translittere ce qui sort du Latin-1.
function pourWinAnsi(texte) {
  return String(texte === null || texte === undefined ? "" : texte)
    .normalize("NFC")
    .replace(/[  ]/g, " ")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .split("")
    .map((c) => {
      if (c.charCodeAt(0) <= 255) return c;
      const sansAccent = c.normalize("NFD").replace(/[̀-ͯ]/g, "");
      return sansAccent.charCodeAt(0) <= 255 ? sansAccent : "?";
    })
    .join("");
}

function moisNom(mois) {
  return MOIS_AFFICHE[mois - 1] || String(mois);
}

export async function construireBulletin({ profil, bulletin }) {
  const doc = await PDFDocument.create();
  doc.setTitle(
    `Bulletin de prime de stage ${moisNom(bulletin.mois)} ${bulletin.annee} - ${profil.nom}`
  );
  doc.setSubject("Bulletin de prime de stage - document informatif");
  doc.setProducer("Mon salaire - Xperience Global Services");
  doc.setCreationDate(new Date());

  const page = doc.addPage([PAGE.largeur, PAGE.hauteur]);
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const gras = await doc.embedFont(StandardFonts.HelveticaBold);

  const largeurUtile = PAGE.largeur - 2 * MARGE;
  let y = PAGE.hauteur - MARGE;

  const ecrire = (texte, x, position, taille, police = normal, couleur = ENCRE) =>
    page.drawText(pourWinAnsi(texte), { x, y: position, size: taille, font: police, color: couleur });

  const ecrireADroite = (texte, droite, position, taille, police = normal, couleur = ENCRE) => {
    const propre = pourWinAnsi(texte);
    const largeur = police.widthOfTextAtSize(propre, taille);
    page.drawText(propre, { x: droite - largeur, y: position, size: taille, font: police, color: couleur });
  };

  const filet = (position, couleur = FILET, epaisseur = 0.8) =>
    page.drawLine({
      start: { x: MARGE, y: position },
      end: { x: MARGE + largeurUtile, y: position },
      thickness: epaisseur,
      color: couleur,
    });

  // --- en-tete ------------------------------------------------------------
  try {
    const reponse = await fetch("./logo_xgs.png");
    const logo = await doc.embedPng(await reponse.arrayBuffer());
    const taille = 46;
    page.drawImage(logo, { x: MARGE, y: y - taille, width: taille, height: taille });
  } catch {
    // Sans logo, le document reste valable : on ne bloque pas un telechargement
    // pour une image.
  }

  ecrire("XPERIENCE GLOBAL SERVICES", MARGE + 58, y - 14, 11, gras);
  ecrire("Bulletin de prime de stage", MARGE + 58, y - 30, 9, normal, ENCRE_DOUCE);
  ecrireADroite(`${moisNom(bulletin.mois)} ${bulletin.annee}`, MARGE + largeurUtile, y - 16, 16, gras);
  ecrireADroite(
    `Réf. ${profil.login || profil.matricule || profil.id} · ${bulletin.annee}-${String(bulletin.mois).padStart(2, "0")}`,
    MARGE + largeurUtile,
    y - 31,
    8,
    normal,
    ENCRE_DOUCE
  );

  y -= 62;
  filet(y, NUIT, 1.4);

  // --- identite -----------------------------------------------------------
  y -= 26;
  const colonne2 = MARGE + largeurUtile / 2 + 10;

  const champ = (libelle, valeur, x, position) => {
    ecrire(libelle.toUpperCase(), x, position, 7.5, gras, ENCRE_DOUCE);
    ecrire(valeur || "-", x, position - 14, 11);
  };

  champ("Agent", profil.nom, MARGE, y);
  champ("Identifiant Auréo", profil.login || "-", colonne2, y);
  y -= 34;
  champ("Poste", bulletin.poste || "-", MARGE, y);
  champ("Projet", bulletin.projet || "-", colonne2, y);

  // --- detail du mois -----------------------------------------------------
  y -= 46;
  // "Detail de Aout" ne se dit pas : on evite l'elision plutot que de la gerer
  // pour chaque mois.
  ecrire(`Détail du mois — ${moisNom(bulletin.mois)} ${bulletin.annee}`, MARGE, y, 12, gras);
  y -= 16;

  const lignes = [
    ["Salaire de base", bulletin.salaire_base],
    ["Net à payer (hors primes)", bulletin.net_a_payer],
    [bulletin.prime_intitule || "Prime du mois précédent", bulletin.prime_montant],
    ["Prime coach métier", bulletin.prime_coach],
  ];

  const hauteurLigne = 27;
  lignes.forEach(([libelle, valeur], index) => {
    const haut = y - index * hauteurLigne;
    if (index % 2 === 0) {
      page.drawRectangle({
        x: MARGE,
        y: haut - hauteurLigne + 7,
        width: largeurUtile,
        height: hauteurLigne,
        color: BANDE,
      });
    }
    ecrire(libelle, MARGE + 10, haut - 9, 10);
    ecrireADroite(`${montantSeul(valeur)} FCFA`, MARGE + largeurUtile - 10, haut - 9, 10);
  });

  y -= lignes.length * hauteurLigne + 6;

  // Le total du mois : la ligne qu'on vient chercher, sur fond nuit.
  page.drawRectangle({
    x: MARGE,
    y: y - 26,
    width: largeurUtile,
    height: 34,
    color: NUIT,
  });
  ecrire("TOTAL DU MOIS", MARGE + 10, y - 15, 10, gras, rgb(1, 1, 1));
  ecrireADroite(
    `${montantSeul(bulletin.total_mois)} FCFA`,
    MARGE + largeurUtile - 10,
    y - 17,
    15,
    gras,
    rgb(1, 1, 1)
  );

  // --- pied ---------------------------------------------------------------
  const edite = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  filet(MARGE + 58, FILET);
  // La mention vient en premier et en gras : c'est elle qui qualifie la piece,
  // elle ne doit pas se lire apres coup.
  ecrire(
    "Document établi à titre informatif. Il ne constitue pas un document officiel.",
    MARGE,
    MARGE + 44,
    8.5,
    gras,
    ENCRE
  );
  ecrire(
    `Édité le ${edite} depuis l'outil Mon salaire, à partir des états transmis par le service RH.`,
    MARGE,
    MARGE + 31,
    8,
    normal,
    ENCRE_DOUCE
  );
  ecrire(
    "Pour toute question ou contestation sur un montant, s'adresser au service RH.",
    MARGE,
    MARGE + 19,
    8,
    normal,
    ENCRE_DOUCE
  );

  return doc.save();
}

export async function telechargerBulletin({ profil, bulletin }) {
  const octets = await construireBulletin({ profil, bulletin });
  const lien = document.createElement("a");
  const url = URL.createObjectURL(new Blob([octets], { type: "application/pdf" }));
  const identifiant = (profil.login || profil.matricule || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");

  lien.href = url;
  lien.download = `prime-stage-${identifiant}-${bulletin.annee}-${String(bulletin.mois).padStart(2, "0")}.pdf`;
  document.body.appendChild(lien);
  lien.click();
  document.body.removeChild(lien);
  URL.revokeObjectURL(url);
}
