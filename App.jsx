import React, { Suspense, lazy, useCallback, useEffect, useState } from "react";
import { AlertTriangle, LayoutDashboard, LogOut, Loader2, Upload } from "lucide-react";
import { C, FONTS, POLICE_TEXTE } from "./theme.js";
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
import EcranAgent from "./EcranAgent.jsx";

// La lecture du classeur embarque SheetJS, soit l'essentiel du poids de l'app.
// Seul un super_admin ouvre ces ecrans : les agents n'ont pas a les telecharger.
const EcranImport = lazy(() => import("./EcranImport.jsx"));
const EcranAdmin = lazy(() => import("./EcranAdmin.jsx"));

const CHAMPS_BULLETIN =
  "annee,mois,projet,poste,salaire_base,net_a_payer,prime_intitule,prime_montant,prime_coach,total_mois";

function Cadre({ children }) {
  return (
    <div
      style={{
        fontFamily: POLICE_TEXTE,
        background: C.canvas,
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 420 }}>{children}</div>
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
  const [vue, setVue] = useState("salaire"); // salaire | import | admin

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

  const styleGlobal = (
    <style>{`@import url('${FONTS}'); .disp{font-family:'Space Grotesk',sans-serif;} * { box-sizing: border-box; } body { margin: 0; } button{cursor:pointer;font-family:inherit;} select,input{font-family:inherit;} .animate-spin{animation:tourne 1s linear infinite;} @keyframes tourne{to{transform:rotate(360deg);}}`}</style>
  );

  if (restauration) {
    return (
      <Cadre>
        {styleGlobal}
        <div className="flex items-center justify-center gap-2" style={{ color: C.muted, fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Reconnexion en cours…
        </div>
      </Cadre>
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

  const ecranDiffere = (contenu) => (
    <>
      {styleGlobal}
      <Suspense
        fallback={
          <Cadre>
            <div
              className="flex items-center justify-center gap-2"
              style={{ color: C.muted, fontSize: 13 }}
            >
              <Loader2 size={16} className="animate-spin" /> Chargement de l’écran…
            </div>
          </Cadre>
        }
      >
        {contenu}
      </Suspense>
    </>
  );

  const retourSalaire = () => {
    setVue("salaire");
    chargerBulletins();
  };

  if (vue === "import" && estSuperAdmin) {
    return ecranDiffere(
      <EcranImport
        session={session}
        onRetour={retourSalaire}
        onAllerAdmin={() => setVue("admin")}
      />
    );
  }

  if (vue === "admin" && estSuperAdmin) {
    return ecranDiffere(
      <EcranAdmin
        session={session}
        onRetour={retourSalaire}
        onAllerImport={() => setVue("import")}
      />
    );
  }

  if (erreurBulletins) {
    return (
      <Cadre>
        {styleGlobal}
        <AlertTriangle size={20} color={C.red} />
        <div style={{ fontSize: 13.5, color: C.text, marginTop: 10, lineHeight: 1.6 }}>
          Impossible de lire vos bulletins : {erreurBulletins}
        </div>
        <button
          type="button"
          onClick={deconnexion}
          className="flex items-center justify-center gap-2"
          style={{
            margin: "16px auto 0",
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
      </Cadre>
    );
  }

  if (bulletins === null) {
    return (
      <Cadre>
        {styleGlobal}
        <div className="flex items-center justify-center gap-2" style={{ color: C.muted, fontSize: 13 }}>
          <Loader2 size={16} className="animate-spin" /> Chargement de vos bulletins…
        </div>
      </Cadre>
    );
  }

  if (!bulletins.length) {
    return (
      <Cadre>
        {styleGlobal}
        <div className="disp" style={{ fontSize: 18, fontWeight: 600, color: C.text }}>
          Bonjour, {session.profil.nom}
        </div>
        <div style={{ fontSize: 13.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
          Aucun bulletin n’est encore enregistré pour votre compte. Si vous avez été payé ce mois-ci,
          contactez le service RH.
        </div>
        <div className="flex items-center justify-center gap-8" style={{ marginTop: 18 }}>
          {estSuperAdmin && (
            <>
              <button
                type="button"
                onClick={() => setVue("admin")}
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
                <LayoutDashboard size={13} /> Tableau de bord
              </button>
              <button
                type="button"
                onClick={() => setVue("import")}
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
            </>
          )}
          <button
            type="button"
            onClick={deconnexion}
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
      </Cadre>
    );
  }

  return (
    <>
      {styleGlobal}
      <EcranAgent
        profil={session.profil}
        bulletins={bulletins}
        onDeconnexion={deconnexion}
        onAllerImport={estSuperAdmin ? () => setVue("import") : null}
        onAllerAdmin={estSuperAdmin ? () => setVue("admin") : null}
      />
    </>
  );
}
