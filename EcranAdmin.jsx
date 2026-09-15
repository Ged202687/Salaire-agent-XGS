import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, Loader2, Upload } from "lucide-react";
import { C, POLICE_TITRE, estVide, formaterFcfa, nomDuMois } from "./theme.js";
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
    <div
      style={{
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: "12px 14px",
        background: C.surface,
      }}
    >
      <div style={{ fontSize: 11.5, color: C.mutedSoft, lineHeight: 1.35 }}>{label}</div>
      <div className="disp" style={{ fontSize: 19, fontWeight: 600, color: C.text, marginTop: 4 }}>
        {valeur}
      </div>
      {note && <div style={{ fontSize: 11, color: C.mutedSoft, marginTop: 3 }}>{note}</div>}
    </div>
  );
}

export default function EcranAdmin({ session, onRetour, onAllerImport }) {
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
    () => [...new Set(vueAnnee.map((l) => l.projet).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")),
    [vueAnnee]
  );

  // Les filtres agent et projet cadrent aussi le graphique ; le filtre mois,
  // non : on garde l'annee entiere sous les yeux et le mois choisi est mis en
  // avant dedans.
  const vuePerimetre = useMemo(
    () =>
      vueAnnee.filter(
        (l) =>
          (agent === TOUS || l.profil_id === agent) && (projet === TOUS || l.projet === projet)
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

  const styleSelect = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13.5,
    color: C.text,
    outline: "none",
    maxWidth: 230,
  };

  const titreSection = {
    fontFamily: POLICE_TITRE,
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    marginTop: 26,
  };

  const cadre = (contenu) => (
    <div style={{ background: C.canvas, minHeight: "100vh", padding: "22px 16px 40px" }}>
      <div
        style={{
          maxWidth: 1040,
          margin: "0 auto",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "26px 26px 22px",
          boxShadow: "0 8px 28px -18px rgba(18,22,31,0.35)",
        }}
      >
        <div className="flex items-center justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onRetour}
            className="flex items-center gap-2"
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontSize: 12.5,
              color: C.muted,
            }}
          >
            <ArrowLeft size={14} /> Retour à mon salaire
          </button>
          <button
            type="button"
            onClick={onAllerImport}
            className="flex items-center gap-2"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12.5,
              color: C.muted,
            }}
          >
            <Upload size={13} /> Importer un classeur
          </button>
        </div>
        {contenu}
      </div>
    </div>
  );

  if (erreur) {
    return cadre(
      <div
        className="flex items-start gap-2"
        style={{
          marginTop: 18,
          background: C.redSoft,
          color: C.red,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 12.5,
        }}
      >
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        Impossible de lire les bulletins : {erreur}
      </div>
    );
  }

  if (lignes === null) {
    return cadre(
      <div
        className="flex items-center gap-2"
        style={{ marginTop: 18, color: C.muted, fontSize: 13 }}
      >
        <Loader2 size={16} className="animate-spin" /> Chargement des bulletins…
      </div>
    );
  }

  if (!lignes.length) {
    return cadre(
      <>
        <div className="disp" style={{ fontSize: 21, fontWeight: 600, color: C.text, marginTop: 14 }}>
          Tableau de bord
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 8, lineHeight: 1.6 }}>
          Aucun bulletin n’est encore enregistré. Importez un classeur pour voir la masse salariale
          apparaître ici.
        </p>
      </>
    );
  }

  const perimetreLibelle = [
    agent === TOUS ? null : agents.find(([id]) => id === agent)?.[1],
    projet === TOUS ? null : projet,
    mois === TOUS ? `${anneeCourante} entière` : `${nomDuMois(Number(mois))} ${anneeCourante}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return cadre(
    <>
      <div className="disp" style={{ fontSize: 21, fontWeight: 600, color: C.text, marginTop: 14 }}>
        Tableau de bord
      </div>
      <p style={{ fontSize: 12.5, color: C.muted, marginTop: 6 }}>
        {lignes.length} bulletin{lignes.length > 1 ? "s" : ""} enregistré
        {lignes.length > 1 ? "s" : ""}
        {dernierImport
          ? ` — dernier import le ${new Date(dernierImport).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}`
          : ""}
        .
      </p>

      {/* Une seule rangee de filtres, au-dessus de tout ce qu'elle cadre. */}
      <div className="flex" style={{ gap: 12, flexWrap: "wrap", margin: "18px 0 20px" }}>
        {annees.length > 1 && (
          <label style={{ fontSize: 11.5, color: C.mutedSoft }}>
            <div style={{ marginBottom: 5 }}>Année</div>
            <select
              value={anneeCourante}
              onChange={(e) => {
                setAnnee(Number(e.target.value));
                setMois(TOUS);
                setAgent(TOUS);
                setProjet(TOUS);
              }}
              style={styleSelect}
            >
              {annees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}

        <label style={{ fontSize: 11.5, color: C.mutedSoft }}>
          <div style={{ marginBottom: 5 }}>Mois</div>
          <select value={mois} onChange={(e) => setMois(e.target.value)} style={styleSelect}>
            <option value={TOUS}>Tous les mois</option>
            {points.map((p) => (
              <option key={p.mois} value={p.mois}>
                {p.libelle}
              </option>
            ))}
          </select>
        </label>

        <label style={{ fontSize: 11.5, color: C.mutedSoft }}>
          <div style={{ marginBottom: 5 }}>Agent</div>
          <select value={agent} onChange={(e) => setAgent(e.target.value)} style={styleSelect}>
            <option value={TOUS}>Tous les agents ({agents.length})</option>
            {agents.map(([id, nom]) => (
              <option key={id} value={id}>
                {nom}
              </option>
            ))}
          </select>
        </label>

        {projets.length > 1 && (
          <label style={{ fontSize: 11.5, color: C.mutedSoft }}>
            <div style={{ marginBottom: 5 }}>Projet</div>
            <select value={projet} onChange={(e) => setProjet(e.target.value)} style={styleSelect}>
              <option value={TOUS}>Tous les projets</option>
              {projets.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {/* Le chiffre principal : ce que la selection coute. */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12.5, color: C.muted }}>
          {agent === TOUS ? "Masse salariale" : "Total payé"} — {perimetreLibelle}
        </div>
        <div
          className="disp"
          style={{
            fontSize: "clamp(2rem, 6.5vw, 2.9rem)",
            fontWeight: 700,
            color: C.text,
            lineHeight: 1.08,
            marginTop: 2,
          }}
        >
          {formaterFcfa(masse)}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 10,
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
          label="Bulletins dans la sélection"
          valeur={vueFiltree.length}
          note={`sur ${vueAnnee.length} en ${anneeCourante}`}
        />
      </div>

      <div style={titreSection}>
        {agent === TOUS ? "Masse salariale par mois" : "Total payé par mois"}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "4px 0 10px" }}>
        {anneeCourante}, en FCFA
        {projet === TOUS ? "" : `, projet ${projet}`}
        {mois === TOUS ? "" : `. Le mois sélectionné est en gras.`}
      </div>
      {points.length ? (
        <GraphiqueMasse
          points={points}
          moisSelectionne={mois === TOUS ? null : Number(mois)}
          etiquette={agent === TOUS ? "Masse salariale par mois" : "Total payé par mois"}
        />
      ) : (
        <div style={{ fontSize: 12.5, color: C.muted }}>
          Aucun total renseigné pour cette sélection.
        </div>
      )}

      <div style={titreSection}>
        {vueFiltree.length} bulletin{vueFiltree.length > 1 ? "s" : ""} dans la sélection
      </div>
      <div style={{ overflowX: "auto", maxHeight: 460, overflowY: "auto", marginTop: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <thead>
            <tr style={{ background: C.canvas, color: C.muted, textAlign: "left" }}>
              {[
                "Agent",
                "Login",
                "Mois",
                "Projet",
                "Salaire de base",
                "Net à payer",
                "Prime / bonus",
                "Prime coach",
                "Total du mois",
              ].map((entete) => (
                <th
                  key={entete}
                  style={{
                    padding: "9px 11px",
                    fontWeight: 600,
                    borderBottom: `1px solid ${C.border}`,
                    whiteSpace: "nowrap",
                    position: "sticky",
                    top: 0,
                    background: C.canvas,
                  }}
                >
                  {entete}
                </th>
              ))}
            </tr>
          </thead>
          <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
            {[...vueFiltree]
              .sort((a, b) => a.mois - b.mois || a.nom.localeCompare(b.nom, "fr"))
              .map((l) => (
                <tr key={`${l.profil_id}-${l.annee}-${l.mois}`} style={{ color: C.text }}>
                  <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                    {l.nom}
                  </td>
                  <td
                    style={{
                      padding: "9px 11px",
                      borderBottom: `1px solid ${C.borderSoft}`,
                      color: C.muted,
                    }}
                  >
                    {l.login}
                  </td>
                  <td
                    style={{
                      padding: "9px 11px",
                      borderBottom: `1px solid ${C.borderSoft}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {nomDuMois(l.mois)}
                  </td>
                  <td
                    style={{
                      padding: "9px 11px",
                      borderBottom: `1px solid ${C.borderSoft}`,
                      color: C.muted,
                    }}
                  >
                    {l.projet || "—"}
                  </td>
                  {[l.salaire_base, l.net_a_payer, l.prime_montant, l.prime_coach, l.total_mois].map(
                    (valeur, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "9px 11px",
                          borderBottom: `1px solid ${C.borderSoft}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formaterFcfa(valeur)}
                      </td>
                    )
                  )}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: C.mutedSoft,
          marginTop: 22,
          paddingTop: 14,
          borderTop: `1px solid ${C.borderSoft}`,
        }}
      >
        Vue réservée aux super administrateurs. Un agent, lui, ne peut lire que ses propres
        bulletins — c’est la base de données qui l’impose, pas cet écran.
      </div>
    </>
  );
}
