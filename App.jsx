import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import {
  C,
  FOND_NUIT,
  POLICE_TEXTE,
  POLICE_TITRE,
  boutonFantome,
  carteVerre,
} from "./theme.js";
import {
  SOUS_PORTAIL,
  SUPABASE_ANON_JWT,
  allerAuPortail,
  effacerAncienneSession,
  rpc,
  supabase,
  supaRest,
} from "./supabase.js";
import Connexion from "./Connexion.jsx";
import Coquille from "./Coquille.jsx";
import EcranAgent from "./EcranAgent.jsx";

// Ces deux ecrans ne descendent qu'a l'ouverture. L'import embarque SheetJS et
// le tableau de bord son propre code : un agent qui consulte son salaire n'a pas
// a les telecharger.
const EcranImport = lazy(() => import("./EcranImport.jsx"));
const EcranAdmin = lazy(() => import("./EcranAdmin.jsx"));

const CHAMPS_BULLETIN =
  "annee,mois,projet,poste,salaire_base,net_a_payer,prime_intitule,prime_montant,prime_coach,total_mois";

const STYLE_GLOBAL = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: ${C.nuitProfond}; -webkit-font-smoothing: antialiased; }
/* Montants alignes colonne sur colonne : chiffres a chasse fixe partout. */
body { font-variant-numeric: tabular-nums; }
button { cursor: pointer; font-family: inherit; }
button:disabled { cursor: not-allowed; opacity: .55; }
select, input { font-family: inherit; }
.disp { font-family: 'Poppins', sans-serif; }
/* Etats des boutons : leurs styles de base sont en ligne, d'ou les !important. */
.bouton-fantome:not(:disabled):hover { border-color: ${C.soleilTrait} !important; color: ${C.encre} !important; background-color: rgba(255,255,255,.04) !important; }
.bouton-fantome.actif:not(:disabled):hover { color: ${C.soleil} !important; background-color: ${C.soleilDoux} !important; }
.bouton-soleil:not(:disabled):hover { background-color: #FFD968 !important; }
.bouton-soleil:not(:disabled):active, .bouton-fantome:not(:disabled):active { transform: scale(.98); }
select { cursor: pointer; transition: border-color .15s ease-out; }
select:hover { border-color: ${C.bordureVive} !important; }
:where(button, a, input, select, [tabindex]):focus-visible { outline: 2px solid ${C.soleil}; outline-offset: 2px; }
/* Champ fichier cache mais atteignable au clavier : le focus s'affiche sur sa zone. */
.fichier-cache { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
.zone-depot { transition: border-color .15s ease-out; }
.zone-depot:focus-within { outline: 2px solid ${C.soleil}; outline-offset: 2px; }
.zone-depot:hover { border-color: ${C.soleilTrait} !important; }
.animate-spin { animation: tourne 1s linear infinite; }
@keyframes tourne { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: .01ms !important; animation-duration: .01ms !important; }
}
::selection { background: rgba(253, 207, 79, .3); }
/* Les listes deroulantes natives ouvrent un menu clair par defaut : on le
   remet dans le meme monde que le reste. */
select option { background: ${C.carteHaute}; color: ${C.encre}; }
::-webkit-scrollbar { width: 10px; height: 10px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,.2); }
`;

function Ecran({ children }) {
  return (
    <div
      style={{
        fontFamily: POLICE_TEXTE,
        minHeight: "100vh",
        background: FOND_NUIT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        color: C.encre,
      }}
    >
      <div style={{ ...carteVerre, padding: "28px 26px", maxWidth: 430, textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [restauration, setRestauration] = useState(true);
  const [chargementAuth, setChargementAuth] = useState(false);
  const [erreurAuth, setErreurAuth] = useState(null);

  const [bulletins, setBulletins] = useState(null);
  const [erreurBulletins, setErreurBulletins] = useState(null);
  const [vue, setVue] = useState("salaire"); // salaire | admin | import

  // --- session Supabase -> session de l'outil (profil, compte actif) --------
  const ouvrirSession = useCallback(async (s) => {
    const profils = await supaRest(`profils?select=*&id=eq.${s.user.id}`, {
      accessToken: s.access_token,
    });
    const profil = profils?.[0];
    if (!profil) throw new Error("Aucun profil rattaché à ce compte.");
    if (profil.actif === false) {
      throw new Error("Ce compte a été désactivé. Contactez un administrateur.");
    }
    return { accessToken: s.access_token, refreshToken: s.refresh_token, user: s.user, profil };
  }, []);

  // --- reprise de la session : celle du portail ou d'un autre outil ---------
  useEffect(() => {
    effacerAncienneSession();
    (async () => {
      try {
        const {
          data: { session: s },
        } = await supabase.auth.getSession();
        if (s) {
          setSession(await ouvrirSession(s));
        } else if (SOUS_PORTAIL) {
          allerAuPortail();
          return;
        }
      } catch (e) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        if (SOUS_PORTAIL) {
          allerAuPortail();
          return;
        }
        setErreurAuth(e.message);
      }
      setRestauration(false);
    })();
  }, [ouvrirSession]);

  // Jeton renouvele (ici ou par un autre outil ouvert), ou deconnexion faite
  // depuis un autre outil : on suit.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((evenement, s) => {
      if (evenement === "TOKEN_REFRESHED" && s) {
        setSession((prec) =>
          prec ? { ...prec, accessToken: s.access_token, refreshToken: s.refresh_token } : prec
        );
      } else if (evenement === "SIGNED_OUT") {
        setSession(null);
        setBulletins(null);
        if (SOUS_PORTAIL) allerAuPortail();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // --- connexion : l'identifiant Aureo, rien d'autre ------------------------
  async function connexion(login, motDePasse) {
    setChargementAuth(true);
    setErreurAuth(null);
    try {
      const email = await rpc("email_from_login", SUPABASE_ANON_JWT, { p_login: login.trim() });
      if (!email) throw new Error("Identifiant inconnu.");

      const { data, error } = await supabase.auth.signInWithPassword({ email, password: motDePasse });
      if (error) {
        throw new Error(
          error.message === "Invalid login credentials" ? "Identifiant ou mot de passe incorrect." : error.message
        );
      }
      try {
        setSession(await ouvrirSession(data.session));
      } catch (e) {
        await supabase.auth.signOut({ scope: "local" }).catch(() => {});
        throw e;
      }
    } catch (e) {
      setErreurAuth(e.message);
    } finally {
      setChargementAuth(false);
    }
  }

  // Deconnexion unique : elle ferme aussi la session du portail et des autres
  // outils ouverts a la meme adresse.
  async function deconnexion() {
    await supabase.auth.signOut().catch(() => {});
    setSession(null);
    setBulletins(null);
    setErreurBulletins(null);
    setVue("salaire");
    if (SOUS_PORTAIL) window.location.replace("/");
  }

  // --- les bulletins de l'agent connecte ------------------------------------
  const chargerBulletins = useCallback(async () => {
    if (!session) return;
    setErreurBulletins(null);
    try {
      const lignes = await supaRest(
        `bulletins_salaire?select=${CHAMPS_BULLETIN}&profil_id=eq.${session.profil.id}` +
          "&order=annee.desc,mois.desc",
        { accessToken: session.accessToken }
      );
      setBulletins(lignes || []);
    } catch (e) {
      setErreurBulletins(e.message);
    }
  }, [session]);

  useEffect(() => {
    chargerBulletins();
  }, [chargerBulletins]);

  const styleGlobal = <style>{STYLE_GLOBAL}</style>;

  if (restauration) {
    return (
      <Ecran>
        {styleGlobal}
        <div
          className="flex items-center justify-center gap-2"
          style={{ color: C.encre2, fontSize: 13 }}
        >
          <Loader2 size={16} className="animate-spin" /> Reconnexion en cours…
        </div>
      </Ecran>
    );
  }

  if (!session) {
    return (
      <>
        {styleGlobal}
        <Connexion onConnexion={connexion} chargement={chargementAuth} erreur={erreurAuth} />
      </>
    );
  }

  const estSuperAdmin = session.profil.role === "super_admin";
  const vueCourante = vue === "salaire" || estSuperAdmin ? vue : "salaire";

  function naviguer(cible) {
    setVue(cible);
    // En revenant sur son salaire, on relit : un import vient peut-etre d'avoir
    // lieu.
    if (cible === "salaire") chargerBulletins();
  }

  const coquille = (contenu, large) => (
    <>
      {styleGlobal}
      <Coquille
        profil={session.profil}
        vue={vueCourante}
        onNaviguer={naviguer}
        onDeconnexion={deconnexion}
        estSuperAdmin={estSuperAdmin}
        large={large}
      >
        <Suspense
          fallback={
            <div
              className="flex items-center gap-2"
              style={{ ...carteVerre, padding: "18px 20px", color: C.encre3, fontSize: 13 }}
            >
              <Loader2 size={16} className="animate-spin" /> Chargement de l’écran…
            </div>
          }
        >
          {contenu}
        </Suspense>
      </Coquille>
    </>
  );

  if (vueCourante === "import") {
    return coquille(
      <EcranImport session={session} onAllerAdmin={() => naviguer("admin")} />,
      true
    );
  }

  if (vueCourante === "admin") {
    return coquille(<EcranAdmin session={session} />, true);
  }

  if (erreurBulletins) {
    return coquille(
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
        Impossible de lire vos bulletins : {erreurBulletins}
      </div>
    );
  }

  if (bulletins === null) {
    return coquille(
      <div
        className="flex items-center gap-2"
        style={{ ...carteVerre, padding: "18px 20px", color: C.encre3, fontSize: 13 }}
      >
        <Loader2 size={16} className="animate-spin" /> Chargement de vos bulletins…
      </div>
    );
  }

  if (!bulletins.length) {
    return coquille(
      <div style={{ ...carteVerre, padding: "28px 26px" }}>
        <div
          style={{
            fontFamily: POLICE_TITRE,
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          Bonjour, {session.profil.nom}
        </div>
        <p style={{ fontSize: 13, color: C.encre2, marginTop: 10, lineHeight: 1.6 }}>
          Aucun bulletin n’est encore enregistré pour votre compte. Si vous avez été payé ce
          mois-ci, contactez le service RH.
        </p>
        {estSuperAdmin && (
          <button
            type="button"
            onClick={() => naviguer("import")}
            className="bouton-fantome"
            style={{ ...boutonFantome, marginTop: 16 }}
          >
            <Upload size={13} /> Importer un classeur
          </button>
        )}
      </div>
    );
  }

  return coquille(<EcranAgent profil={session.profil} bulletins={bulletins} />);
}
