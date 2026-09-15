import React, { useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { C, POLICE_TITRE, formaterFcfa, nomDuMois } from "./theme.js";
import { lireClasseur, rapprocherProfils } from "./classeur.js";
import { supaRest } from "./supabase.js";

const TAILLE_LOT = 200;
// Au-dela, la liste des rejets devient illisible et alourdit la page pour rien :
// le compte total suffit a savoir ou on en est.
const MAX_REJETS_AFFICHES = 40;

const clefMois = (annee, mois) => `${annee}-${String(mois).padStart(2, "0")}`;

export default function EcranImport({ session, onRetour, onAllerAdmin }) {
  const [lecture, setLecture] = useState(null); // { feuilles, retenues, rejetees, nomFichier }
  const [moisChoisis, setMoisChoisis] = useState(() => new Set());
  const [erreur, setErreur] = useState(null);
  const [occupe, setOccupe] = useState(false);
  const [resultat, setResultat] = useState(null);

  async function choisirFichier(evenement) {
    const fichier = evenement.target.files?.[0];
    if (!fichier) return;

    setErreur(null);
    setResultat(null);
    setLecture(null);
    setOccupe(true);

    try {
      const donnees = new Uint8Array(await fichier.arrayBuffer());
      const classeur = XLSX.read(donnees, { type: "array", cellDates: false });
      const feuillesBrutes = classeur.SheetNames.map((nom) => ({
        nom,
        lignes: XLSX.utils.sheet_to_json(classeur.Sheets[nom], {
          header: 1,
          raw: true,
          defval: null,
          blankrows: true,
        }),
      }));

      const { lignes, feuilles } = lireClasseur(feuillesBrutes);
      if (!lignes.length) {
        throw new Error(
          "Aucune ligne exploitable dans ce classeur. Vérifiez que les feuilles sont nommées « Mois AAAA » et qu’elles portent une colonne « Nom et prénoms »."
        );
      }

      // Lecture seule : on ne fait que rapprocher et regarder ce qui existe
      // deja, rien n'est ecrit avant que l'import soit demande explicitement.
      const [profils, dejaEnBase] = await Promise.all([
        supaRest("profils?select=id,nom,login,matricule,role,actif&order=nom.asc", {
          accessToken: session.accessToken,
        }),
        supaRest("bulletins_salaire?select=annee,mois&limit=5000", {
          accessToken: session.accessToken,
        }),
      ]);
      const { retenues, rejetees } = rapprocherProfils(lignes, profils || []);

      const existants = new Map();
      (dejaEnBase || []).forEach((b) => {
        const clef = clefMois(b.annee, b.mois);
        existants.set(clef, (existants.get(clef) || 0) + 1);
      });

      setLecture({
        feuilles,
        retenues,
        rejetees,
        existants,
        nomFichier: fichier.name,
        profils: profils?.length || 0,
      });

      // Par defaut, on ne coche que les mois absents de la base : deposer le
      // classeur de septembre ne doit pas reecrire avril a aout sans qu'on l'ait
      // demande.
      setMoisChoisis(
        new Set(
          feuilles
            .filter((f) => !f.ignoree)
            .map((f) => clefMois(f.annee, f.mois))
            .filter((clef) => !existants.has(clef))
        )
      );
    } catch (e) {
      setErreur(e.message);
    } finally {
      setOccupe(false);
      // On remet le champ a zero pour pouvoir redeposer le meme fichier.
      evenement.target.value = "";
    }
  }

  async function ecrire() {
    if (!aEcrire.length) return;
    setOccupe(true);
    setErreur(null);

    try {
      const bulletins = aEcrire.map((ligne) => ({
        profil_id: ligne.profil.id,
        annee: ligne.annee,
        mois: ligne.mois,
        projet: ligne.projet,
        poste: ligne.poste,
        salaire_base: ligne.salaire_base,
        net_a_payer: ligne.net_a_payer,
        prime_intitule: ligne.prime_intitule,
        prime_montant: ligne.prime_montant,
        prime_coach: ligne.prime_coach,
        total_mois: ligne.total_mois,
        importe_par: session.profil.id,
      }));

      let ecrites = 0;
      for (let debut = 0; debut < bulletins.length; debut += TAILLE_LOT) {
        const lot = bulletins.slice(debut, debut + TAILLE_LOT);
        await supaRest("bulletins_salaire?on_conflict=profil_id,annee,mois", {
          method: "POST",
          accessToken: session.accessToken,
          body: lot,
          prefer: "resolution=merge-duplicates,return=minimal",
        });
        ecrites += lot.length;
      }

      setResultat({ ecrites, mois: moisRetenusLibelle });
      setLecture(null);
      setMoisChoisis(new Set());
    } catch (e) {
      setErreur(e.message);
    } finally {
      setOccupe(false);
    }
  }

  const moisDuFichier = (lecture?.feuilles || []).filter((f) => !f.ignoree);
  const estChoisi = (annee, mois) => moisChoisis.has(clefMois(annee, mois));
  const aEcrire = (lecture?.retenues || []).filter((l) => estChoisi(l.annee, l.mois));
  const rejetsChoisis = (lecture?.rejetees || []).filter((l) => estChoisi(l.annee, l.mois));
  const moisEcrases = moisDuFichier.filter(
    (f) => estChoisi(f.annee, f.mois) && lecture?.existants?.has(clefMois(f.annee, f.mois))
  );
  const moisRetenusLibelle = moisDuFichier
    .filter((f) => estChoisi(f.annee, f.mois))
    .map((f) => `${nomDuMois(f.mois)} ${f.annee}`)
    .join(", ");

  function basculerMois(annee, mois) {
    const clef = clefMois(annee, mois);
    setMoisChoisis((precedent) => {
      const suivant = new Set(precedent);
      if (suivant.has(clef)) suivant.delete(clef);
      else suivant.add(clef);
      return suivant;
    });
  }

  const titreSection = {
    fontFamily: POLICE_TITRE,
    fontSize: 15,
    fontWeight: 600,
    color: C.text,
    marginTop: 24,
    marginBottom: 8,
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
            marginBottom: 16,
          }}
        >
          <ArrowLeft size={14} /> Retour à mon salaire
        </button>

        <div className="disp" style={{ fontSize: 21, fontWeight: 600, color: C.text }}>
          Importer le classeur de paie
        </div>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 6, lineHeight: 1.55 }}>
          Déposez le fichier .xlsx du mois. Chaque feuille nommée « Mois AAAA » est lue, les lignes
          sont rapprochées des comptes Auréo, et <strong>rien n’est écrit avant que vous le
          demandiez</strong>. Vous choisissez ensuite les mois à écrire : les mois déjà enregistrés
          sont décochés d’office, pour qu’un classeur de septembre ne réécrive pas les mois
          précédents.
        </p>
        <p style={{ fontSize: 12.5, color: C.muted, marginTop: 8, lineHeight: 1.55 }}>
          Le rapprochement se fait sur la colonne <strong>login</strong> si elle existe, sinon sur
          la colonne <strong>matricule</strong>. Le login est la clef fiable : un matricule porté par
          deux comptes ne peut pas être départagé.
        </p>

        <label
          className="flex items-center justify-center gap-2"
          style={{
            marginTop: 18,
            border: `1.5px dashed ${C.border}`,
            borderRadius: 12,
            padding: "22px 16px",
            cursor: occupe ? "default" : "pointer",
            color: C.muted,
            fontSize: 13,
            background: C.canvas,
          }}
        >
          {occupe ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {occupe ? "Lecture en cours…" : "Choisir un classeur .xlsx"}
          <input
            type="file"
            accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={choisirFichier}
            disabled={occupe}
            style={{ display: "none" }}
          />
        </label>

        {erreur && (
          <div
            className="flex items-start gap-2"
            style={{
              marginTop: 16,
              background: C.redSoft,
              color: C.red,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12.5,
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {erreur}
          </div>
        )}

        {resultat && (
          <div
            className="flex items-center gap-2"
            style={{
              marginTop: 16,
              background: C.greenSoft,
              color: C.green,
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12.5,
            }}
          >
            <CheckCircle2 size={14} /> {resultat.ecrites} bulletin
            {resultat.ecrites > 1 ? "s" : ""} écrit{resultat.ecrites > 1 ? "s" : ""} dans la base
            {resultat.mois ? ` — ${resultat.mois}` : ""}.
            {onAllerAdmin && (
              <button
                type="button"
                onClick={onAllerAdmin}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  marginLeft: 4,
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: C.green,
                  textDecoration: "underline",
                }}
              >
                Voir le tableau de bord
              </button>
            )}
          </div>
        )}

        {lecture && (
          <>
            <div style={titreSection}>Ce que le fichier contient</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 10 }}>
              {lecture.nomFichier} — {lecture.profils} comptes Auréo consultés.
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: C.canvas, color: C.muted, textAlign: "left" }}>
                    {[
                      "Importer",
                      "Feuille",
                      "Mois",
                      "Lignes",
                      "Déjà en base",
                      "Colonne de prime",
                      "Colonne de total",
                      "Rapproché par",
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
                <tbody>
                  {lecture.feuilles.map((feuille) => {
                    const dejaLa = feuille.ignoree
                      ? 0
                      : lecture.existants.get(clefMois(feuille.annee, feuille.mois)) || 0;
                    return (
                    <tr key={feuille.nom} style={{ color: feuille.ignoree ? C.mutedSoft : C.text }}>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.ignoree ? (
                          "—"
                        ) : (
                          <input
                            type="checkbox"
                            checked={estChoisi(feuille.annee, feuille.mois)}
                            onChange={() => basculerMois(feuille.annee, feuille.mois)}
                            aria-label={`Importer ${nomDuMois(feuille.mois)} ${feuille.annee}`}
                            style={{ width: 16, height: 16, cursor: "pointer" }}
                          />
                        )}
                      </td>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.nom}
                      </td>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.ignoree ? `ignorée — ${feuille.raison}` : `${nomDuMois(feuille.mois)} ${feuille.annee}`}
                      </td>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.ignoree ? "—" : feuille.lignes}
                      </td>
                      <td
                        style={{
                          padding: "9px 11px",
                          borderBottom: `1px solid ${C.borderSoft}`,
                          color: dejaLa ? C.amber : C.mutedSoft,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {feuille.ignoree ? "—" : dejaLa ? `${dejaLa} bulletins` : "rien"}
                      </td>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.colonnePrime || "—"}
                      </td>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.colonneTotal || "—"}
                      </td>
                      <td style={{ padding: "9px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {feuille.identifiantPar || "—"}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {moisEcrases.length > 0 && (
              <div
                className="flex items-start gap-2"
                style={{
                  marginTop: 12,
                  background: C.amberSoft,
                  color: "#8A5A10",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>
                  Vous avez coché{" "}
                  {moisEcrases.map((f) => `${nomDuMois(f.mois)} ${f.annee}`).join(", ")}, déjà
                  enregistré{moisEcrases.length > 1 ? "s" : ""} en base. Les bulletins de ces mois
                  seront remplacés par ceux du fichier. Décochez-les pour n’écrire que les nouveaux
                  mois.
                </span>
              </div>
            )}

            {rejetsChoisis.length > 0 && (
              <>
                <div style={titreSection}>
                  {rejetsChoisis.length} ligne{rejetsChoisis.length > 1 ? "s" : ""} laissée
                  {rejetsChoisis.length > 1 ? "s" : ""} de côté
                </div>
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 8 }}>
                  Ces lignes ne seront pas importées. Corrigez le classeur ou le compte Auréo, puis
                  redéposez le fichier.
                </div>
                <div style={{ overflowX: "auto", maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <tbody>
                      {rejetsChoisis.slice(0, MAX_REJETS_AFFICHES).map((ligne, i) => (
                        <tr key={i}>
                          <td
                            style={{
                              padding: "8px 11px",
                              borderBottom: `1px solid ${C.borderSoft}`,
                              whiteSpace: "nowrap",
                              color: C.text,
                            }}
                          >
                            {ligne.feuille} · ligne {ligne.ligneClasseur}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              borderBottom: `1px solid ${C.borderSoft}`,
                              color: C.text,
                            }}
                          >
                            {ligne.nom}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              borderBottom: `1px solid ${C.borderSoft}`,
                              color: C.red,
                            }}
                          >
                            {ligne.raison}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {rejetsChoisis.length > MAX_REJETS_AFFICHES && (
                  <div style={{ fontSize: 12, color: C.mutedSoft, marginTop: 6 }}>
                    et {rejetsChoisis.length - MAX_REJETS_AFFICHES} autre
                    {rejetsChoisis.length - MAX_REJETS_AFFICHES > 1 ? "s" : ""} ligne
                    {rejetsChoisis.length - MAX_REJETS_AFFICHES > 1 ? "s" : ""} non affichée
                    {rejetsChoisis.length - MAX_REJETS_AFFICHES > 1 ? "s" : ""}.
                  </div>
                )}
              </>
            )}

            <div style={titreSection}>
              {aEcrire.length} bulletin{aEcrire.length > 1 ? "s" : ""} prêt
              {aEcrire.length > 1 ? "s" : ""} à écrire
              {moisRetenusLibelle ? ` — ${moisRetenusLibelle}` : ""}
            </div>
            {!aEcrire.length && (
              <div style={{ fontSize: 12.5, color: C.muted }}>
                Aucun mois coché : cochez au moins un mois dans le tableau ci-dessus.
              </div>
            )}
            <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: C.canvas, color: C.muted, textAlign: "left" }}>
                    {["Agent", "Login", "Mois", "Total du mois"].map((entete) => (
                      <th
                        key={entete}
                        style={{
                          padding: "9px 11px",
                          fontWeight: 600,
                          borderBottom: `1px solid ${C.border}`,
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
                  {aEcrire.map((ligne, i) => (
                    <tr key={i} style={{ color: C.text }}>
                      <td style={{ padding: "8px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {ligne.profil.nom}
                      </td>
                      <td style={{ padding: "8px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {ligne.profil.login || "—"}
                      </td>
                      <td style={{ padding: "8px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {nomDuMois(ligne.mois)} {ligne.annee}
                      </td>
                      <td style={{ padding: "8px 11px", borderBottom: `1px solid ${C.borderSoft}` }}>
                        {formaterFcfa(ligne.total_mois)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={ecrire}
              disabled={occupe || !aEcrire.length}
              className="flex items-center justify-center gap-2"
              style={{
                marginTop: 18,
                background: occupe ? C.mutedSoft : C.ink,
                color: "#FFFFFF",
                border: "none",
                borderRadius: 10,
                padding: "11px 16px",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {occupe ? <Loader2 size={14} className="animate-spin" /> : null}
              Écrire {aEcrire.length} bulletin{aEcrire.length > 1 ? "s" : ""} dans la base
            </button>
          </>
        )}
      </div>
    </div>
  );
}
