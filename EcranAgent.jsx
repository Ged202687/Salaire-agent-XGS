import React, { useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import {
  C,
  POLICE_CHIFFRE,
  POLICE_TITRE,
  boutonSoleil,
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
import GraphiqueEvolution from "./GraphiqueEvolution.jsx";

function Puce({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${C.bordure}`,
        borderRadius: 999,
        padding: "3px 11px",
        fontSize: 11.5,
        color: C.encre2,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Tuile({ label, valeur, accent }) {
  return (
    <div style={{ ...tuileVerre, borderColor: accent ? C.soleilTrait : C.bordure }}>
      <div style={{ ...etiquetteChamp, marginBottom: 7 }}>{label}</div>
      <div
        style={{
          fontFamily: POLICE_CHIFFRE,
          fontSize: 17,
          fontWeight: 500,
          color: valeur === "-" ? C.encre3 : C.encre,
          letterSpacing: "-0.01em",
        }}
      >
        {valeur}
      </div>
    </div>
  );
}

// L'ecart avec le mois precedent. La fleche et le signe portent le sens ; la
// couleur ne fait que le confirmer.
function Ecart({ bulletin, precedent }) {
  const pilule = (couleur, fond, contenu, gras = true) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: fond,
        color: couleur,
        border: `1px solid ${fond === "transparent" ? C.bordure : "transparent"}`,
        borderRadius: 999,
        padding: "5px 12px",
        fontSize: 12.5,
        fontWeight: gras ? 600 : 400,
      }}
    >
      {contenu}
    </span>
  );

  if (estVide(bulletin.total_mois)) {
    return pilule(C.encre3, "transparent", "Total du mois non renseigné dans le fichier", false);
  }
  if (!precedent) {
    return pilule(C.encre3, "transparent", "Premier mois payé de l’année", false);
  }
  if (estVide(precedent.total_mois)) {
    return pilule(
      C.encre3,
      "transparent",
      `Pas de comparaison : ${nomDuMois(precedent.mois)} n’est pas renseigné`,
      false
    );
  }

  const ecart = Number(bulletin.total_mois) - Number(precedent.total_mois);
  if (Math.abs(ecart) < 1) {
    return pilule(C.encre3, "transparent", `Identique à ${nomDuMois(precedent.mois)}`, false);
  }

  const hausse = ecart > 0;
  return pilule(
    hausse ? C.hausse : C.baisse,
    hausse ? C.hausseDoux : C.baisseDoux,
    `${hausse ? "▲" : "▼"} ${hausse ? "+" : "−"}${formaterFcfa(Math.abs(ecart))} vs ${nomDuMois(
      precedent.mois
    )}`
  );
}

export default function EcranAgent({ profil, bulletins }) {
  const annees = useMemo(
    () => [...new Set(bulletins.map((b) => b.annee))].sort((a, b) => b - a),
    [bulletins]
  );
  const [annee, setAnnee] = useState(annees[0]);
  const [mois, setMois] = useState(null);
  const [pdfEnCours, setPdfEnCours] = useState(false);
  const [erreurPdf, setErreurPdf] = useState(null);

  const anneeCourante = annees.includes(annee) ? annee : annees[0];
  const vueAnnee = useMemo(
    () => bulletins.filter((b) => b.annee === anneeCourante).sort((a, b) => a.mois - b.mois),
    [bulletins, anneeCourante]
  );

  const moisCourant =
    mois !== null && vueAnnee.some((b) => b.mois === mois)
      ? mois
      : vueAnnee[vueAnnee.length - 1]?.mois;

  const rang = vueAnnee.findIndex((b) => b.mois === moisCourant);
  const bulletin = vueAnnee[rang];
  const precedent = rang > 0 ? vueAnnee[rang - 1] : null;

  const pointsGraphique = vueAnnee
    .filter((b) => !estVide(b.total_mois))
    .map((b) => ({
      mois: b.mois,
      annee: b.annee,
      libelle: nomDuMois(b.mois),
      valeur: Number(b.total_mois),
    }));

  const moisPayes = pointsGraphique.length;
  const cumul = pointsGraphique.reduce((somme, p) => somme + p.valeur, 0);

  // pdf-lib ne descend qu'au clic : un agent qui consulte son salaire sans
  // telecharger ne paie pas le poids de la bibliotheque.
  async function telecharger() {
    setPdfEnCours(true);
    setErreurPdf(null);
    try {
      const { telechargerBulletin } = await import("./bulletinPdf.js");
      await telechargerBulletin({ profil, bulletin });
    } catch (e) {
      setErreurPdf(e.message || "Le bulletin n’a pas pu être produit.");
    } finally {
      setPdfEnCours(false);
    }
  }

  return (
    <>
      {/* Une seule rangee de filtres, au-dessus de tout ce qu'elle cadre. */}
      <div className="flex" style={{ gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        {annees.length > 1 && (
          <label>
            <div style={etiquetteChamp}>Année</div>
            <select
              value={anneeCourante}
              onChange={(e) => {
                setAnnee(Number(e.target.value));
                setMois(null);
              }}
              style={selectSombre}
            >
              {annees.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          <div style={etiquetteChamp}>Mois</div>
          <select
            value={moisCourant}
            onChange={(e) => setMois(Number(e.target.value))}
            style={selectSombre}
          >
            {vueAnnee.map((b) => (
              <option key={b.mois} value={b.mois}>
                {nomDuMois(b.mois)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Le chiffre que l'agent vient chercher : un seul par ecran. */}
      <section
        style={{ ...carteVerre, position: "relative", padding: "26px 26px 24px", overflow: "hidden" }}
      >
        <div style={filetLumineux} />

        <div className="flex items-start justify-between" style={{ gap: 18, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={etiquetteChamp}>
              Total payé — {nomDuMois(bulletin.mois)} {bulletin.annee}
            </div>
            <div
              style={{
                fontFamily: POLICE_TITRE,
                fontSize: "clamp(2.5rem, 8.5vw, 4.2rem)",
                fontWeight: 700,
                letterSpacing: "-0.035em",
                lineHeight: 1,
                color: C.encre,
                margin: "6px 0 14px",
              }}
            >
              {montantSeul(bulletin.total_mois)}
              <span
                style={{
                  fontSize: "0.34em",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: C.soleil,
                  marginLeft: 12,
                  verticalAlign: "0.42em",
                }}
              >
                FCFA
              </span>
            </div>
            <Ecart bulletin={bulletin} precedent={precedent} />
          </div>

          {/* Sur telephone, cette colonne passe sous le chiffre : elle s'aligne
              alors a gauche comme le reste, au lieu de flotter a droite. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 10,
              minWidth: 0,
            }}
          >
            <button type="button" onClick={telecharger} disabled={pdfEnCours} className="bouton-soleil" style={boutonSoleil}>
              {pdfEnCours ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              {pdfEnCours ? "Préparation…" : "Télécharger en PDF"}
            </button>
            <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
              {profil.login && <Puce>{profil.login}</Puce>}
              {bulletin.projet && <Puce>{bulletin.projet}</Puce>}
              {bulletin.poste && <Puce>{bulletin.poste}</Puce>}
            </div>
          </div>
        </div>

        {erreurPdf && (
          <div
            style={{
              marginTop: 14,
              background: C.baisseDoux,
              color: C.baisse,
              borderRadius: 10,
              padding: "9px 12px",
              fontSize: 12.5,
            }}
          >
            {erreurPdf}
          </div>
        )}
      </section>

      {/* De quoi ce total est fait. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))",
          gap: 12,
          marginTop: 14,
        }}
      >
        <Tuile label="Salaire de base" valeur={formaterFcfa(bulletin.salaire_base)} />
        <Tuile label="Net à payer (hors primes)" valeur={formaterFcfa(bulletin.net_a_payer)} />
        <Tuile
          label={bulletin.prime_intitule || "Prime du mois précédent"}
          valeur={formaterFcfa(bulletin.prime_montant)}
          accent
        />
        <Tuile label="Prime coach métier" valeur={formaterFcfa(bulletin.prime_coach)} />
      </div>

      {/* Evolution. */}
      <section style={{ ...carteVerre, padding: "22px 24px 18px", marginTop: 14 }}>
        <div className="flex items-baseline justify-between" style={{ gap: 12, flexWrap: "wrap" }}>
          <div style={titreSection}>Évolution du total payé</div>
          {moisPayes > 0 && (
            <div style={{ fontSize: 12, color: C.encre3 }}>
              Cumul {anneeCourante} sur {moisPayes} mois payé{moisPayes > 1 ? "s" : ""} :{" "}
              <strong style={{ color: C.encre2, fontFamily: POLICE_CHIFFRE, fontWeight: 500 }}>
                {formaterFcfa(cumul)}
              </strong>
            </div>
          )}
        </div>

        {moisPayes < 2 ? (
          <div style={{ fontSize: 12.5, color: C.encre3, marginTop: 8 }}>
            Un seul mois payé pour le moment : l’évolution s’affichera dès le mois suivant.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: C.encre3, margin: "5px 0 14px" }}>
              Mois par mois sur {anneeCourante}, en FCFA. Le repère marque {nomDuMois(moisCourant)}.
            </div>
            <GraphiqueEvolution points={pointsGraphique} moisSelectionne={moisCourant} />
          </>
        )}
      </section>

      {/* Le tableau : la version du graphique lisible sans couleur. */}
      <section style={{ ...carteVerre, padding: "22px 24px 20px", marginTop: 14 }}>
        <div style={titreSection}>Tableau détaillé</div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr>
                {[
                  "Mois",
                  "Salaire de base",
                  "Net à payer",
                  "Prime / bonus",
                  "Prime coach",
                  "Total du mois",
                ].map((entete, i) => (
                  <th
                    key={entete}
                    style={{
                      ...etiquetteChamp,
                      marginBottom: 0,
                      textAlign: i === 0 ? "left" : "right",
                      padding: "0 12px 9px",
                      borderBottom: `1px solid ${C.bordure}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entete}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontFamily: POLICE_CHIFFRE }}>
              {vueAnnee.map((b) => {
                const courant = b.mois === moisCourant;
                return (
                  <tr key={b.mois} style={{ background: courant ? C.verreHaut : "transparent" }}>
                    <td
                      style={{
                        padding: "11px 12px",
                        borderBottom: `1px solid ${C.bordure}`,
                        borderLeft: `2px solid ${courant ? C.soleil : "transparent"}`,
                        fontFamily: POLICE_TITRE,
                        fontWeight: courant ? 600 : 500,
                        color: courant ? C.encre : C.encre2,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {nomDuMois(b.mois)}
                    </td>
                    {[
                      b.salaire_base,
                      b.net_a_payer,
                      b.prime_montant,
                      b.prime_coach,
                      b.total_mois,
                    ].map((valeur, i) => (
                      <td
                        key={i}
                        style={{
                          padding: "11px 12px",
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
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <p style={{ fontSize: 11.5, color: C.encre3, marginTop: 20, lineHeight: 1.6 }}>
        Consultation seule : ces montants sont ceux transmis par le service RH. L’accès est protégé
        par votre compte Auréo, et vous ne voyez que vos propres bulletins.
      </p>
    </>
  );
}
