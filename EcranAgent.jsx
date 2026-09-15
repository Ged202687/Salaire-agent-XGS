import React, { useMemo, useState } from "react";
import { LogOut, Upload } from "lucide-react";
import { C, POLICE_TITRE, formaterFcfa, estVide, nomDuMois } from "./theme.js";
import GraphiqueEvolution from "./GraphiqueEvolution.jsx";

function Puce({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        border: `1px solid ${C.border}`,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11.5,
        color: C.muted,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Tuile({ label, valeur }) {
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
      <div
        className="disp"
        style={{ fontSize: 19, fontWeight: 600, color: C.text, marginTop: 4 }}
      >
        {valeur}
      </div>
    </div>
  );
}

// L'ecart avec le mois precedent. La fleche et le signe portent le sens ; la
// couleur ne fait que le confirmer.
function Ecart({ bulletin, precedent }) {
  const style = { fontSize: 13, fontWeight: 600, marginTop: 6 };

  if (estVide(bulletin.total_mois)) {
    return (
      <div style={{ ...style, color: C.mutedSoft, fontWeight: 500 }}>
        Total du mois non renseigné dans le fichier
      </div>
    );
  }
  if (!precedent) {
    return (
      <div style={{ ...style, color: C.mutedSoft, fontWeight: 500 }}>
        Premier mois payé de l’année
      </div>
    );
  }
  if (estVide(precedent.total_mois)) {
    return (
      <div style={{ ...style, color: C.mutedSoft, fontWeight: 500 }}>
        Pas de comparaison : le total du mois précédent ({nomDuMois(precedent.mois)}) n’est pas
        renseigné
      </div>
    );
  }

  const ecart = Number(bulletin.total_mois) - Number(precedent.total_mois);
  if (Math.abs(ecart) < 1) {
    return (
      <div style={{ ...style, color: C.mutedSoft, fontWeight: 500 }}>
        Identique à {nomDuMois(precedent.mois)}
      </div>
    );
  }

  const hausse = ecart > 0;
  return (
    <div style={{ ...style, color: hausse ? C.green : C.red }}>
      {hausse ? "▲" : "▼"} {hausse ? "+" : "−"}
      {formaterFcfa(Math.abs(ecart))} par rapport à {nomDuMois(precedent.mois)}
    </div>
  );
}

export default function EcranAgent({ profil, bulletins, onDeconnexion, onAllerImport }) {
  const annees = useMemo(
    () => [...new Set(bulletins.map((b) => b.annee))].sort((a, b) => b - a),
    [bulletins]
  );
  const [annee, setAnnee] = useState(annees[0]);

  const anneeCourante = annees.includes(annee) ? annee : annees[0];
  const vueAnnee = useMemo(
    () => bulletins.filter((b) => b.annee === anneeCourante).sort((a, b) => a.mois - b.mois),
    [bulletins, anneeCourante]
  );

  const [mois, setMois] = useState(null);
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

  const styleSelect = {
    background: C.surface,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13.5,
    color: C.text,
    outline: "none",
    minWidth: 130,
  };

  const titreSection = {
    fontFamily: POLICE_TITRE,
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    marginTop: 26,
  };

  return (
    <div style={{ background: C.canvas, minHeight: "100vh", padding: "22px 16px 40px" }}>
      <div
        style={{
          maxWidth: 860,
          margin: "0 auto",
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 18,
          padding: "26px 26px 22px",
          boxShadow: "0 8px 28px -18px rgba(18,22,31,0.35)",
        }}
      >
        <div
          className="flex items-start justify-between"
          style={{ gap: 14, flexWrap: "wrap", marginBottom: 18 }}
        >
          <div>
            <div
              className="disp"
              style={{ fontSize: 21, fontWeight: 600, color: C.text, lineHeight: 1.25 }}
            >
              Bonjour, {profil.nom}
            </div>
            <div className="flex" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {profil.login && <Puce>{profil.login}</Puce>}
              {bulletin?.projet && <Puce>{bulletin.projet}</Puce>}
              {bulletin?.poste && <Puce>{bulletin.poste}</Puce>}
            </div>
          </div>

          <div className="flex" style={{ gap: 8 }}>
            {onAllerImport && (
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
            )}
            <button
              type="button"
              onClick={onDeconnexion}
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
              <LogOut size={13} /> Se déconnecter
            </button>
          </div>
        </div>

        {/* Une seule rangee de filtres, au-dessus de tout ce qu'elle cadre. */}
        <div className="flex" style={{ gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
          {annees.length > 1 && (
            <label style={{ fontSize: 11.5, color: C.mutedSoft }}>
              <div style={{ marginBottom: 5 }}>Année</div>
              <select
                value={anneeCourante}
                onChange={(e) => {
                  setAnnee(Number(e.target.value));
                  setMois(null);
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
            <select
              value={moisCourant}
              onChange={(e) => setMois(Number(e.target.value))}
              style={styleSelect}
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
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12.5, color: C.muted }}>
            Total payé — {nomDuMois(bulletin.mois)} {bulletin.annee}
          </div>
          <div
            className="disp"
            style={{
              fontSize: "clamp(2.1rem, 7.5vw, 3.1rem)",
              fontWeight: 700,
              color: C.text,
              lineHeight: 1.08,
              marginTop: 2,
            }}
          >
            {formaterFcfa(bulletin.total_mois)}
          </div>
          <Ecart bulletin={bulletin} precedent={precedent} />
        </div>

        {/* De quoi ce total est fait. */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
            gap: 10,
          }}
        >
          <Tuile label="Salaire de base" valeur={formaterFcfa(bulletin.salaire_base)} />
          <Tuile label="Net à payer (hors primes)" valeur={formaterFcfa(bulletin.net_a_payer)} />
          <Tuile
            label={bulletin.prime_intitule || "Prime du mois précédent"}
            valeur={formaterFcfa(bulletin.prime_montant)}
          />
          <Tuile label="Prime coach métier" valeur={formaterFcfa(bulletin.prime_coach)} />
        </div>

        <div style={titreSection}>Évolution du total payé</div>
        {moisPayes < 2 ? (
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>
            Un seul mois payé pour le moment : l’évolution s’affichera dès le mois suivant.
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: C.muted, margin: "4px 0 10px" }}>
              Mois par mois sur {anneeCourante}, en FCFA. Le repère vertical marque{" "}
              {nomDuMois(moisCourant)}.
            </div>
            <GraphiqueEvolution points={pointsGraphique} moisSelectionne={moisCourant} />
          </>
        )}

        {moisPayes > 0 && (
          <div style={{ fontSize: 12.5, color: C.muted, marginTop: 12 }}>
            Cumul {anneeCourante} sur {moisPayes} mois payé{moisPayes > 1 ? "s" : ""} :{" "}
            <strong style={{ color: C.text }}>{formaterFcfa(cumul)}</strong>
          </div>
        )}

        <div style={titreSection}>Tableau détaillé</div>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: C.canvas, color: C.muted, textAlign: "left" }}>
                {[
                  "Mois",
                  "Salaire de base",
                  "Net à payer (hors primes)",
                  "Prime / bonus",
                  "Prime coach métier",
                  "Total du mois",
                ].map((entete) => (
                  <th
                    key={entete}
                    style={{
                      padding: "9px 11px",
                      fontWeight: 600,
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entete}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody style={{ fontVariantNumeric: "tabular-nums" }}>
              {vueAnnee.map((b) => (
                <tr
                  key={b.mois}
                  style={{
                    background: b.mois === moisCourant ? C.canvas : C.surface,
                    color: C.text,
                  }}
                >
                  <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                    {nomDuMois(b.mois)}
                  </td>
                  {[b.salaire_base, b.net_a_payer, b.prime_montant, b.prime_coach, b.total_mois].map(
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
          Consultation seule : ces montants sont ceux transmis par le service RH. L’accès est
          protégé par votre compte Auréo.
        </div>
      </div>
    </div>
  );
}
