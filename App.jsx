import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Upload } from "lucide-react";
import {
  C,
  FONTS,
  FOND_NUIT,
  POLICE_TEXTE,
  POLICE_TITRE,
  boutonFantome,
  carteVerre,
} from "./theme.js";
import {
  SUPABASE_ANON_JWT,
  effacerSessionStockee,
  ecrireSessionStockee,
  lireSessionStockee,
  rpc,
  supaAuth,
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
@import url('${FONTS}');
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; background: ${C.nuitProfond}; }
button { cursor: pointer; font-family: inherit; }
button:disabled { cursor: default; opacity: .75; }
select, input { font-family: inherit; }
.disp { font-family: 'Space Grotesk', sans-serif; }
.animate-spin { animation: tourne 1s linear infinite; }
@keyframes tourne { to { transform: rotate(360deg); } }
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

  // --- reprise d'une session apres un rechargement de page ------------------
  useEffect(() => {
    (async () => {
      const stockee = lireSessionStockee();
      if (!stockee?.refreshToken) {
        setRestauration(false);
        return;
      }
      try {
        const rafraichie = await supaAuth("token?grant_type=refresh_token", {
          refresh_token: stockee.refreshToken,
        });
        const profils = await supaRest(`profils?select=*&id=eq.${rafraichie.user.id}`, {
          accessToken: rafraichie.access_token,
        });
        const profil = profils?.[0];
        if (!profil || profil.actif === false) throw new Error("session invalide");

        const reprise = {
          accessToken: rafraichie.access_token,
          refreshToken: rafraichie.refresh_token,
          user: rafraichie.user,
          profil,
        };
        setSession(reprise);
        ecrireSessionStockee(reprise);
      } catch {
        effacerSessionStockee();
      } finally {
        setRestauration(false);
      }
    })();
  }, []);

  // --- connexion : l'identifiant Aureo, rien d'autre ------------------------
  async function connexion(login, motDePasse) {
    setChargementAuth(true);
    setErreurAuth(null);
    try {
      const email = await rpc("email_from_login", SUPABASE_ANON_JWT, { p_login: login.trim() });
      if (!email) throw new Error("Identifiant inconnu.");

      const jetons = await supaAuth("token?grant_type=password", { email, password: motDePasse });
      const profils = await supaRest(`profils?select=*&id=eq.${jetons.user.id}`, {
        accessToken: jetons.access_token,
      });
      const profil = profils?.[0];
      if (!profil) throw new Error("Aucun profil rattaché à ce compte.");
      if (profil.actif === false) {
        throw new Error("Ce compte a été désactivé. Contactez un administrateur.");
      }

      const nouvelle = {
        accessToken: jetons.access_token,
        refreshToken: jetons.refresh_token,
        user: jetons.user,
        profil,
      };
      setSession(nouvelle);
      ecrireSessionStockee(nouvelle);
    } catch (e) {
      setErreurAuth(e.message);
    } finally {
      setChargementAuth(false);
    }
  }

  function deconnexion() {
    effacerSessionStockee();
    setSession(null);
    setBulletins(null);
    setErreurBulletins(null);
    setVue("salaire");
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

  // Le jeton Supabase vit environ une heure : on le rafraichit avant qu'il
  // expire, sinon un agent resté sur la page verrait ses appels echouer.
  useEffect(() => {
    if (!session?.refreshToken) return undefined;
    const minuterie = setInterval(async () => {
      try {
        const rafraichie = await supaAuth("token?grant_type=refresh_token", {
          refresh_token: session.refreshToken,
        });
        const misAJour = {
          ...session,
          accessToken: rafraichie.access_token,
          refreshToken: rafraichie.refresh_token,
        };
        setSession(misAJour);
        ecrireSessionStockee(misAJour);
      } catch {
        // Jeton revoque : le prochain appel echouera et renverra a la connexion.
      }
    }, 45 * 60 * 1000);
    return () => clearInterval(minuterie);
  }, [session]);

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
