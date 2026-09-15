// Lecture du classeur de paie. C'est la traduction de ce que faisait la version
// Python, corrections comprises :
//   - le report du mois precedent change d'intitule d'une feuille a l'autre
//     ("Bonus avril", "Prime Mai", "Prime Juillet"), donc on accepte aussi
//     "bonus" et pas seulement "prime" ;
//   - "Total Juillet sans formule" doit etre teste avant "Total <mois>", sinon
//     il ecrase la colonne du total du mois sur la feuille de juillet ;
//   - les identifiants sont compares sans casse ni espaces autour.
import { MOIS_FR, sansAccent } from "./theme.js";

export const FEUILLES_IGNOREES = ["prime manager"];

export function normaliserIdentifiant(valeur) {
  if (valeur === null || valeur === undefined) return "";
  return String(valeur).trim().toLowerCase();
}

// "Août 2026" -> { mois: 8, annee: 2026 }
export function extraireMoisAnnee(nomFeuille) {
  const trouve = /(\D+)\s*(\d{4})/.exec(nomFeuille || "");
  if (!trouve) return null;
  const mot = sansAccent(trouve[1]);
  const index = MOIS_FR.findIndex((m) => mot.includes(m));
  if (index === -1) return null;
  return { mois: index + 1, annee: Number(trouve[2]) };
}

export function trouverLigneEntete(lignes, maxScan = 15) {
  const limite = Math.min(lignes.length, maxScan);
  for (let r = 0; r < limite; r += 1) {
    const valeurs = (lignes[r] || []).map(sansAccent);
    if (valeurs.includes("matricule") || valeurs.some((v) => v.includes("nom et prenom"))) {
      return r;
    }
  }
  return -1;
}

export function mapperColonnes(entete, moisNorm) {
  const mapping = {};
  (entete || []).forEach((brut, index) => {
    const intitule = sansAccent(brut);
    if (!intitule) return;

    if (intitule.includes("matricule")) mapping.matricule = index;
    else if (intitule.includes("login") || intitule.includes("identifiant")) mapping.login = index;
    else if (intitule.includes("nom et prenom")) mapping.nom = index;
    else if (intitule.includes("projet") && mapping.projet === undefined) mapping.projet = index;
    else if (intitule.includes("superviseur")) mapping.superviseur = index;
    else if (intitule === "poste") mapping.poste = index;
    else if (intitule.includes("salaire de base")) mapping.salaireBase = index;
    else if (intitule.includes("net a payer") && !intitule.includes("total")) mapping.netAPayer = index;
    else if (intitule.includes("coach")) mapping.primeCoach = index;
    else if (
      (intitule.includes("prime") || intitule.includes("bonus")) &&
      mapping.prime === undefined
    ) {
      mapping.prime = index;
      mapping.primeIntitule = String(brut).trim();
    } else if (intitule.includes("total")) {
      if (intitule.includes("sans formule")) {
        if (mapping.totalPrecedent === undefined) mapping.totalPrecedent = index;
      } else if (moisNorm && intitule.includes(moisNorm)) {
        mapping.totalMois = index;
      }
    }
  });
  return mapping;
}

function nombreOuNull(valeur) {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const nombre = typeof valeur === "number" ? valeur : Number(String(valeur).replace(/\s/g, ""));
  return Number.isFinite(nombre) ? Math.round(nombre * 100) / 100 : null;
}

function texteOuNull(valeur) {
  if (valeur === null || valeur === undefined) return null;
  const texte = String(valeur).trim();
  return texte === "" ? null : texte;
}

/**
 * @param {{ nom: string, lignes: any[][] }[]} feuilles  feuilles brutes du classeur
 * @returns {{ lignes: object[], feuilles: object[] }}
 */
export function lireClasseur(feuilles) {
  const lignes = [];
  const rapportFeuilles = [];

  feuilles.forEach(({ nom, lignes: grille }) => {
    if (FEUILLES_IGNOREES.includes(sansAccent(nom))) {
      rapportFeuilles.push({ nom, ignoree: true, raison: "feuille exclue" });
      return;
    }

    const periode = extraireMoisAnnee(nom);
    if (!periode) {
      rapportFeuilles.push({ nom, ignoree: true, raison: "aucun mois lisible dans le nom" });
      return;
    }

    const indexEntete = trouverLigneEntete(grille);
    if (indexEntete === -1) {
      rapportFeuilles.push({ nom, ignoree: true, raison: "ligne d'en-tête introuvable" });
      return;
    }

    const entete = grille[indexEntete];
    const mapping = mapperColonnes(entete, MOIS_FR[periode.mois - 1]);
    if (mapping.nom === undefined) {
      rapportFeuilles.push({ nom, ignoree: true, raison: "colonne des noms introuvable" });
      return;
    }

    let retenues = 0;
    for (let r = indexEntete + 1; r < grille.length; r += 1) {
      const ligne = grille[r] || [];
      const valeurNom = texteOuNull(ligne[mapping.nom]);
      if (!valeurNom) continue; // ligne vide, ou ligne de total en bas de tableau

      lignes.push({
        feuille: nom,
        ligneClasseur: r + 1,
        annee: periode.annee,
        mois: periode.mois,
        nom: valeurNom,
        login: mapping.login === undefined ? null : texteOuNull(ligne[mapping.login]),
        matricule: mapping.matricule === undefined ? null : texteOuNull(ligne[mapping.matricule]),
        projet: mapping.projet === undefined ? null : texteOuNull(ligne[mapping.projet]),
        poste: mapping.poste === undefined ? null : texteOuNull(ligne[mapping.poste]),
        salaire_base: mapping.salaireBase === undefined ? null : nombreOuNull(ligne[mapping.salaireBase]),
        net_a_payer: mapping.netAPayer === undefined ? null : nombreOuNull(ligne[mapping.netAPayer]),
        prime_intitule: mapping.primeIntitule || null,
        prime_montant: mapping.prime === undefined ? null : nombreOuNull(ligne[mapping.prime]),
        prime_coach: mapping.primeCoach === undefined ? null : nombreOuNull(ligne[mapping.primeCoach]),
        total_mois: mapping.totalMois === undefined ? null : nombreOuNull(ligne[mapping.totalMois]),
      });
      retenues += 1;
    }

    rapportFeuilles.push({
      nom,
      ignoree: false,
      mois: periode.mois,
      annee: periode.annee,
      lignes: retenues,
      colonnePrime: mapping.primeIntitule || null,
      colonneTotal:
        mapping.totalMois === undefined ? null : String(entete[mapping.totalMois]).trim(),
      identifiantPar: mapping.login !== undefined ? "login" : mapping.matricule !== undefined ? "matricule" : null,
    });
  });

  return { lignes, feuilles: rapportFeuilles };
}

/**
 * Rapproche chaque ligne du classeur d'un profil Aureo. Le classeur peut porter
 * une colonne "login" (la cible) ou seulement l'ancienne colonne "matricule".
 * Rien n'est devine : une ligne qu'on ne sait pas rattacher est signalee, pas
 * importee.
 */
export function rapprocherProfils(lignes, profils) {
  const parLogin = new Map();
  const parMatricule = new Map();

  profils.forEach((profil) => {
    const login = normaliserIdentifiant(profil.login);
    if (login) parLogin.set(login, profil);

    const matricule = normaliserIdentifiant(profil.matricule);
    if (matricule) {
      // Un matricule porte par plusieurs profils ne peut plus servir de clef.
      parMatricule.set(matricule, parMatricule.has(matricule) ? "ambigu" : profil);
    }
  });

  const retenues = [];
  const rejetees = [];
  const dejaVu = new Map();

  lignes.forEach((ligne) => {
    const login = normaliserIdentifiant(ligne.login);
    const matricule = normaliserIdentifiant(ligne.matricule);
    let profil = null;
    let clef = null;

    if (login) {
      profil = parLogin.get(login) || null;
      clef = `login ${ligne.login}`;
    }
    if (!profil && matricule) {
      const trouve = parMatricule.get(matricule);
      clef = `matricule ${ligne.matricule}`;
      if (trouve === "ambigu") {
        rejetees.push({
          ...ligne,
          raison: `le matricule ${ligne.matricule} est porté par plusieurs comptes Auréo : ajoutez la colonne "login" au classeur`,
        });
        return;
      }
      profil = trouve || null;
    }

    if (!clef) {
      rejetees.push({ ...ligne, raison: "ni login ni matricule sur la ligne" });
      return;
    }
    if (!profil) {
      rejetees.push({ ...ligne, raison: `aucun compte Auréo pour ce ${clef}` });
      return;
    }

    const empreinte = `${profil.id}|${ligne.annee}|${ligne.mois}`;
    const precedente = dejaVu.get(empreinte);
    if (precedente) {
      rejetees.push({
        ...ligne,
        raison: `deux lignes pour ${profil.nom} sur ce mois (déjà vu ligne ${precedente} de la même feuille)`,
      });
      return;
    }
    dejaVu.set(empreinte, ligne.ligneClasseur);

    retenues.push({ ...ligne, profil });
  });

  return { retenues, rejetees };
}
