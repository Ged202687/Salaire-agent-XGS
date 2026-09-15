import React, { useState } from "react";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { C, FONTS, POLICE_TITRE, boutonSoleil, carteVerre } from "./theme.js";

// L'entree dans l'outil. Le meme monde nocturne que la suite, et les memes
// identifiants qu'Aureo : rien a creer, rien a retenir de plus.
export default function Connexion({ onConnexion, chargement, erreur }) {
  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [focus, setFocus] = useState(null);

  const styleChamp = (nom) => ({
    width: "100%",
    background: focus === nom ? C.verreHaut : C.verre,
    border: `1px solid ${focus === nom ? C.soleil : C.bordure}`,
    borderRadius: 12,
    padding: "13px 15px",
    fontSize: 14,
    color: C.encre,
    outline: "none",
    transition: "border-color .16s ease, background .16s ease",
    marginTop: 7,
  });

  const styleEtiquette = {
    fontSize: 10.5,
    fontWeight: 600,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: C.encre3,
  };

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 18% 20%, #1B2559 0%, #000B53 45%, #00040B 100%)",
        position: "relative",
        overflow: "hidden",
        padding: 20,
      }}
    >
      <style>{`@import url('${FONTS}');`}</style>

      {/* Halos repris des teintes du logo : le soleil et la nuit. */}
      <div
        style={{
          position: "absolute",
          width: 560,
          height: 560,
          borderRadius: "50%",
          background: C.soleil,
          opacity: 0.1,
          filter: "blur(100px)",
          top: -180,
          right: -150,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 440,
          height: 440,
          borderRadius: "50%",
          background: "#3B4FA8",
          opacity: 0.24,
          filter: "blur(110px)",
          bottom: -170,
          left: -130,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
          zIndex: 1,
          width: "100%",
          maxWidth: 380,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <img
            src="./logo_xgs.png"
            alt="Xperience Global Services"
            style={{ width: 96, height: 96, borderRadius: 22, objectFit: "cover" }}
          />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: POLICE_TITRE,
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: "-0.03em",
                color: C.encre,
                lineHeight: 1.1,
              }}
            >
              Mon salaire
            </div>
            <p style={{ fontSize: 13, color: C.encre3, marginTop: 7 }}>
              Connectez-vous avec vos identifiants Auréo
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConnexion(login, motDePasse);
          }}
          style={{ ...carteVerre, padding: 28, width: "100%" }}
        >
          <div style={{ marginBottom: 18 }}>
            <label style={styleEtiquette} htmlFor="champ-login">
              Login
            </label>
            <input
              id="champ-login"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              onFocus={() => setFocus("login")}
              onBlur={() => setFocus(null)}
              style={styleChamp("login")}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={styleEtiquette} htmlFor="champ-mot-de-passe">
              Mot de passe
            </label>
            <input
              id="champ-mot-de-passe"
              type="password"
              autoComplete="current-password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              onFocus={() => setFocus("motDePasse")}
              onBlur={() => setFocus(null)}
              style={styleChamp("motDePasse")}
            />
          </div>

          {erreur && (
            <div
              className="flex items-center gap-2"
              style={{
                background: C.baisseDoux,
                color: C.baisse,
                borderRadius: 11,
                padding: "10px 12px",
                fontSize: 12.5,
                marginBottom: 18,
              }}
            >
              <AlertTriangle size={14} /> {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            style={{ ...boutonSoleil, width: "100%", padding: "14px 18px" }}
          >
            {chargement ? (
              <>
                <Loader2 size={15} className="animate-spin" /> Connexion…
              </>
            ) : (
              <>
                Voir mon salaire <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: C.encre3, textAlign: "center", margin: 0, lineHeight: 1.6 }}>
          Consultation seule. Pour une question sur un montant, contactez le service RH.
        </p>
      </div>
    </div>
  );
}
