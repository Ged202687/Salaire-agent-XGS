import React, { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { C, FONTS } from "./theme.js";

// Meme ecran que la connexion d'Aureo, a dessein : c'est le meme identifiant et
// le meme mot de passe, l'agent doit le reconnaitre tout de suite.
export default function Connexion({ onConnexion, chargement, erreur }) {
  const [login, setLogin] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [focus, setFocus] = useState(null);

  const styleChamp = (nom) => ({
    width: "100%",
    background: C.canvas,
    border: `1.5px solid ${focus === nom ? "#000B53" : "transparent"}`,
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 13.5,
    outline: "none",
    transition: "border-color .15s ease",
    marginTop: 6,
  });

  const styleEtiquette = {
    fontSize: 11,
    fontWeight: 600,
    color: "#8B93A3",
    letterSpacing: "0.02em",
    textTransform: "uppercase",
  };

  return (
    <div
      style={{
        fontFamily: "'IBM Plex Sans', sans-serif",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at 18% 20%, #263070 0%, #000B53 45%, #00051F 100%)",
        position: "relative",
        overflow: "hidden",
        padding: 20,
      }}
    >
      <style>{`@import url('${FONTS}'); .disp{font-family:'Space Grotesk',sans-serif;} * { box-sizing: border-box; } button{cursor:pointer;font-family:inherit;} input{font-family:inherit;}`}</style>

      <div
        style={{
          position: "absolute",
          width: 520,
          height: 520,
          borderRadius: "50%",
          background: "#FDCF4F",
          opacity: 0.1,
          filter: "blur(90px)",
          top: -160,
          right: -140,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 420,
          height: 420,
          borderRadius: "50%",
          background: "#3B4FA8",
          opacity: 0.22,
          filter: "blur(100px)",
          bottom: -160,
          left: -120,
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 26,
          zIndex: 1,
          width: "100%",
          maxWidth: 360,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <img
            src="./logo_xgs.png"
            alt="Xperience Global Services"
            style={{ width: 210, height: "auto", borderRadius: 12 }}
          />
          <div style={{ textAlign: "center" }}>
            <div
              className="disp"
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#C9CEDA",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Mon salaire
            </div>
            <p style={{ fontSize: 12.5, color: "#8B93A3", marginTop: 3 }}>
              Connectez-vous avec vos identifiants Auréo
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConnexion(login, motDePasse);
          }}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            borderRadius: 18,
            padding: 30,
            width: "100%",
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ marginBottom: 16 }}>
            <label style={styleEtiquette}>Login</label>
            <input
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

          <div style={{ marginBottom: 22 }}>
            <label style={styleEtiquette}>Mot de passe</label>
            <input
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
                background: "rgba(198,73,63,0.15)",
                color: "#E8938C",
                borderRadius: 9,
                padding: "9px 11px",
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={13} /> {erreur}
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="flex items-center justify-center gap-2"
            style={{
              width: "100%",
              background: chargement ? "#4A5580" : "#FDCF4F",
              color: chargement ? "#C9CEDA" : "#00051F",
              border: "none",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 13.5,
              fontWeight: 600,
            }}
          >
            {chargement ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Connexion…
              </>
            ) : (
              "Voir mon salaire"
            )}
          </button>
        </form>

        <p style={{ fontSize: 11.5, color: "#6C7689", textAlign: "center", margin: 0 }}>
          Consultation seule. Pour une question sur un montant, contactez le service RH.
        </p>
      </div>
    </div>
  );
}
