import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  C,
  POLICE_CHIFFRE,
  POLICE_TEXTE,
  POLICE_TITRE,
  carteVerre,
  estVide,
  etiquetteChamp,
  filetLumineux,
  formaterFcfa,
  montantSeul,
  nomDuMois,
  selectSombre,
  titreSection,
  tuileVerre,
} from "./theme.js";
import { supaRest } from "./supabase.js";
import GraphiqueMasse from "./GraphiqueMasse.jsx";

const CHAMPS =
  "profil_id,annee,mois,projet,poste,salaire_base,net_a_payer," +
  "prime_intitule,prime_montant,prime_coach,total_mois,importe_le";

const TOUS = "__tous__";

function nombre(valeur) {
  return estVide(valeur) ? 0 : Number(valeur);
}

function Tuile({ label, valeur, note }) {
  return (
    <div style={tuileVerre}>
      <div style={{ ...etiquetteChamp, marginBottom: 7 }}>{label}</div>
      <div
        style={{
          fontFamily: POLICE_CHIFFRE,
          fontSize: 17,
          fontWeight: 500,
          color: C.encre,
          letterSpacing: "-0.01em",
        }}
      >
        {valeur}
      </div>
      {note && <div style={{ fontSize: 11, color: C.encre3, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

export default function EcranAdmin({ session }) {
  const [lignes, setLignes] = useState(null);
  const [erreur, setErreur] = useState(null);

  const [annee, setAnnee] = useState(null);
  const [mois, setMois] = useState(TOUS);
  const [agent, setAgent] = useState(TOUS);
  const [projet, setProjet] = useState(TOUS);

  // Deux requetes simples plutot qu'une jointure imbriquee : la meme lecture de
  // profils que l'ecran d'import, donc un comportement deja eprouve.
  useEffect(() => {
    (async () => {
      try {
        const [bulletins, profils] = await Promise.all([
          supaRest(`bulletins_salaire?select=${CHAMPS}&order=annee.desc,mois.desc&limit=5000`, {
            accessToken: session.accessToken,
          }),
          supaRest("profils?select=id,nom,login,role&order=nom.asc", {
            accessToken: session.accessToken,
          }),
        ]);

        const parId = new Map((profils || []).map((p) => [p.id, p]));
        setLignes(
          (bulletins || []).map((b) => {
            const profil = parId.get(b.profil_id);
            return {
              ...b,
              nom: profil?.nom || "(compte inconnu)",
              login: profil?.login || "—",
            };
          })
        );
      } catch (e) {
        setErreur(e.message);
      }
    })();
  }, [session.accessToken]);

  const annees = useMemo(
    () => [...new Set((lignes || []).map((l) => l.annee))].sort((a, b) => b - a),
    [lignes]
  );
  const anneeCourante = annee !== null && annees.includes(annee) ? annee : annees[0];

  const vueAnnee = useMemo(
    () => (lignes || []).filter((l) => l.annee === anneeCourante),
    [lignes, anneeCourante]
  );

  const agents = useMemo(() => {
    const parId = new Map();
    vueAnnee.forEach((l) => parId.set(l.profil_id, l.nom));
    return [...parId.entries()].sort((a, b) => a[1].localeCompare(b[1], "fr"));
  }, [vueAnnee]);

  const projets = useMemo(
    () =>
      [...new Set(vueAnnee.map((l) => l.projet).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "fr")
      ),
    [vueAnnee]
  );

  // Les filtres agent et projet cadrent aussi le graphique ; le filtre mois,
  // non : on garde l'annee entiere sous les yeux et le mois choisi est mis en
  // avant dedans.
  const vuePerimetre = useMemo(
    () =>
      vueAnnee.filter(
        (l) => (agent === TOUS || l.profil_id === agent) && (projet === TOUS || l.projet === projet)
      ),
    [vueAnnee, agent, projet]
  );

  const vueFiltree = useMemo(
    () => vuePerimetre.filter((l) => mois === TOUS || l.mois === Number(mois)),
    [vuePerimetre, mois]
  );

  const points = useMemo(() => {
    const parMois = new Map();
    vuePerimetre.forEach((l) => {
      if (estVide(l.total_mois)) return;
      const cumul = parMois.get(l.mois) || { valeur: 0, effectif: 0 };
      cumul.valeur += Number(l.total_mois);
      cumul.effectif += 1;
      parMois.set(l.mois, cumul);
    });
    return [...parMois.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([m, cumul]) => ({
        mois: m,
        annee: anneeCourante,
        libelle: nomDuMois(m),
        valeur: cumul.valeur,
        effectif: cumul.effectif,
      }));
  }, [vuePerimetre, anneeCourante]);

  // La fenetre des trois derniers mois se termine au mois choisi, pas a la fin
  // de l'annee : demander juin doit donner avril-mai-juin. Sans mois choisi,
  // elle se termine au dernier mois paye. Et elle ne compte que les mois ou
  // l'agent a effectivement un bulletin : trois mois pour un agent arrive en
  // juillet, ce serait une moyenne calculee sur du vide.
  const fenetreTrois = useMemo(() => {
    const presents = [...new Set(vuePerimetre.map((l) => l.mois))].sort((a, b) => a - b);
    const fin = mois === TOUS ? presents[presents.length - 1] : Number(mois);
    return presents.filter((m) => m <= fin).slice(-3);
  }, [vuePerimetre, mois]);

  const lignesFenetre = useMemo(
    () => vuePerimetre.filter((l) => fenetreTrois.includes(l.mois)),
    [vuePerimetre, fenetreTrois]
  );

  const primesFenetre = lignesFenetre.reduce(
    (somme, l) => somme + nombre(l.prime_montant) + nombre(l.prime_coach),
    0
  );
  // Le diviseur est le nombre de bulletins, pas le nombre de mois : pour un seul
  // agent cela revient a une moyenne par mois, et pour tout le monde a une
  // moyenne par agent et par mois. Les deux se lisent.
  const moyennePrimes = lignesFenetre.length ? primesFenetre / lignesFenetre.length : null;

  const masse = vueFiltree.reduce((somme, l) => somme + nombre(l.total_mois), 0);
  const primes = vueFiltree.reduce(
    (somme, l) => somme + nombre(l.prime_montant) + nombre(l.prime_coach),
    0
  );
  const effectif = new Set(vueFiltree.map((l) => l.profil_id)).size;
  const moisPayes = new Set(vueFiltree.map((l) => l.mois)).size;
  const dernierImport = (lignes || []).reduce(
    (recent, l) => (l.importe_le && (!recent || l.importe_le > recent) ? l.importe_le : recent),
    null
  );

  if (erreur) {
    return (
      <div
        className="flex items-start gap-2"
        style={{
          ...carteVerre,
          borderColor: "rgba(255, 129, 115, 0.35)",
          padding: "16px 18px",
          color: C.baisse,
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        Impossible de lire les bulletins : {erreur}
      </div>
    );
  }

  if (lignes === null) {
    return (
      <div
        className="flex items-center gap-2"
        style={{ ...carteVerre, padding: "18px 20px", color: C.encre3, fontSize: 13 }}
      >
        <Loader2 size={16} className="animate-spin" /> Chargement des bulletins…
      </div>
    );
  }

  if (!lignes.length) {
    return (
      <div style={{ ...carteVerre, padding: "26px 26px 24px" }}>
        <div style={{ ...titreSection, fontSize: 19 }}>Tableau de bord</div>
        <p style={{ fontSize: 13, color: C.encre2, marginTop: 10, lineHeight: 1.6 }}>
          Aucun bulletin n’est encore enregistré. Importez un classeur pour voir la masse salariale
          apparaître ici.
        </p>
      </div>
    );
  }

  const perimetre = [
    agent === TOUS ? null : agents.find(([id]) => id === agent)?.[1],
    projet === TOUS ? null : projet,
    mois === TOUS ? `${anneeCourante} entière` : `${nomDuMois(Number(mois))} ${anneeCourante}`,
  ]
    .filter(Boolean)
    .join(" · ");

  const champFiltre = (libelle, contenu) => (
    <label>
      <div style={etiquetteChamp}>{libelle}</div>
      {contenu}
    </label>
  );

  return (
    <>
      {/* Une seule rangee de filtres, au-dessus de tout ce qu'elle cadre. */}
      <div className="flex" style={{ gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        {annees.length > 1 &&
          champFiltre(
            "Année",
            <select
              value={anneeCourante}
              onChange={(e) => {
                setAnnee(Number(e.target.value));
                setMois(TOUS);
                setAgent(TOUS);
                setProjet(TOUS);
              }}
              style={selectSombre}
            >
              {annees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}

        {champFiltre(
          "Mois",
          <select value={mois} onChange={(e) => setMois(e.target.value)} style={selectSombre}>
            <option value={TOUS}>Tous les mois</option>
            {points.map((p) => (
              <option key={p.mois} value={p.mois}>
                {p.libelle}
              </option>
            ))}
          </select>
        )}

        {champFiltre(
          "Agent",
          <select value={agent} onChange={(e) => setAgent(e.target.value)} style={selectSombre}>
            <option value={TOUS}>Tous les agents ({agents.length})</option>
            {agents.map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </select>
        )}

        {projets.length > 1 &&
          champFiltre(
            "Projet",
            <select value={projet} onChange={(e) => setProjet(e.target.value)} style={selectSombre}>
              <option value={TOUS}>Tous les projets</option>
              {projets.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
      </div>

      {/* Le chiffre principal : ce que la selection coute. */}
      <section
        style={{ ...carteVerre, position: "relative", padding: "26px 26px 24px", overflow: "hidden" }}
      >
        <div style={filetLumineux} />
        <div className="flex items-start justify-between" style={{ gap: 18, flexWrap: "wrap" }}>
          <div>
            <div style={etiquetteChamp}>
              {agent === TOUS ? "Masse salariale" : "Total payé"} — {perimetre}
            </div>
            <div
              style={{
                fontFamily: POLICE_TITRE,
                fontSize: "clamp(2.2rem, 7vw, 3.6rem)",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1,
                color: C.encre,
                marginTop: 6,
              }}
            >
              {montantSeul(masse)}
              <span
                style={{
                  fontSize: "0.34em",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: C.soleil,
                  marginLeft: 11,
                  verticalAlign: "0.42em",
                }}
              >
                FCFA
              </span>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: C.encre3, textAlign: "right", lineHeight: 1.6 }}>
            {lignes.length} bulletin{lignes.length > 1 ? "s" : ""} en base
            {dernierImport && (
              <>
                <br />
                dernier import le{" "}
                {new Date(dernierImport).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </>
            )}
          </div>
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        <Tuile
          label="Agents payés"
          valeur={effectif}
          note={mois === TOUS ? `sur ${moisPayes} mois` : null}
        />
        <Tuile
          label={mois === TOUS ? "Total moyen par agent" : "Moyenne par agent"}
          valeur={effectif ? formaterFcfa(masse / effectif) : "-"}
        />
        <Tuile label="Dont primes" valeur={formaterFcfa(primes)} />
        <Tuile
          label={
            agent === TOUS
              ? "Prime moyenne par agent et par mois — 3 derniers mois"
              : "Prime moyenne par mois — 3 derniers mois"
          }
          valeur={moyennePrimes === null ? "-" : formaterFcfa(moyennePrimes)}
          note={
            fenetreTrois.length
              ? `${fenetreTrois.map(nomDuMois).join(" · ")} — ${lignesFenetre.length} bulletin${
                  lignesFenetre.length > 1 ? "s" : ""
                }`
              : "aucun mois payé"
          }
        />
        <Tuile
          label="Bulletins dans la sélection"
          valeur={vueFiltree.length}
          note={`sur ${vueAnnee.length} en ${anneeCourante}`}
        />
      </div>

      <section style={{ ...carteVerre, padding: "22px 24px 18px", marginTop: 14 }}>
        <div style={titreSection}>
          {agent === TOUS ? "Masse salariale par mois" : "Total payé par mois"}
        </div>
        <div style={{ fontSize: 12.5, color: C.encre3, margin: "5px 0 14px" }}>
          {anneeCourante}, en FCFA
          {projet === TOUS ? "" : `, projet ${projet}`}
          {mois === TOUS ? "" : ". Le mois sélectionné est en gras."}
        </div>
        {points.length ? (
          <GraphiqueMasse
            points={points}
            moisSelectionne={mois === TOUS ? null : Number(mois)}
            etiquette={agent === TOUS ? "Masse salariale par mois" : "Total payé par mois"}
          />
        ) : (
          <div style={{ fontSize: 12.5, color: C.encre3 }}>
            Aucun total renseigné pour cette sélection.
          </div>
        )}
      </section>

      <section style={{ ...carteVerre, padding: "22px 24px 20px", marginTop: 14 }}>
        <div style={titreSection}>
          {vueFiltree.length} bulletin{vueFiltree.length > 1 ? "s" : ""} dans la sélection
        </div>
        {vueFiltree.length === 0 ? (
          <div style={{ fontSize: 13, color: C.encre3, padding: "22px 0 6px", textAlign: "center" }}>
            Aucun bulletin ne correspond à ces filtres.
          </div>
        ) : (
        <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {[
                  ["Agent", "left"],
                  ["Login", "left"],
                  ["Mois", "left"],
                  ["Projet", "left"],
                  ["Salaire de base", "right"],
                  ["Net à payer", "right"],
                  ["Prime / bonus", "right"],
                  ["Prime coach", "right"],
                  ["Total du mois", "right"],
                ].map(([entete, alignement]) => (
                  <th
                    key={entete}
                    style={{
                      ...etiquetteChamp,
                      marginBottom: 0,
                      textAlign: alignement,
                      padding: "0 12px 9px",
                      borderBottom: `1px solid ${C.bordure}`,
                      whiteSpace: "nowrap",
                      position: "sticky",
                      top: 0,
                      background: C.carte,
                    }}
                  >
                    {entete}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontFamily: POLICE_CHIFFRE }}>
              {[...vueFiltree]
                .sort((a, b) => a.mois - b.mois || a.nom.localeCompare(b.nom, "fr"))
                .map((l) => (
                  <tr key={`${l.profil_id}-${l.annee}-${l.mois}`}>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${C.bordure}`,
                        fontFamily: POLICE_TEXTE,
                        color: C.encre,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.nom}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${C.bordure}`,
                        color: C.encre3,
                      }}
                    >
                      {l.login}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${C.bordure}`,
                        color: C.encre2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {nomDuMois(l.mois)}
                    </td>
                    <td
                      style={{
                        padding: "10px 12px",
                        borderBottom: `1px solid ${C.bordure}`,
                        color: C.encre3,
                      }}
                    >
                      {l.projet || "—"}
                    </td>
                    {[
                      l.salaire_base,
                      l.net_a_payer,
                      l.prime_montant,
                      l.prime_coach,
                      l.total_mois,
                    ].map((valeur, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "10px 12px",
                          borderBottom: `1px solid ${C.bordure}`,
                          textAlign: "right",
                          whiteSpace: "nowrap",
                          color: estVide(valeur) ? C.encre3 : i === 4 ? C.encre : C.encre2,
                          fontWeight: i === 4 ? 500 : 400,
                        }}
                      >
                        {formaterFcfa(valeur)}
                      </td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        )}
      </section>

      <p style={{ fontSize: 11.5, color: C.encre3, marginTop: 20, lineHeight: 1.6 }}>
        Vue réservée aux super administrateurs. Un agent, lui, ne peut lire que ses propres
        bulletins — c’est la base de données qui l’impose, pas cet écran.
      </p>
    </>
  );
}
