import React from "react";
import { LayoutDashboard, LogOut, Receipt, Upload } from "lucide-react";
import {
  C,
  FOND_NUIT,
  POLICE_TEXTE,
  POLICE_TITRE,
  boutonFantome,
} from "./theme.js";

const ONGLETS = [
  { clef: "salaire", libelle: "Mon salaire", Icone: Receipt, pourTous: true },
  { clef: "admin", libelle: "Tableau de bord", Icone: LayoutDashboard, pourTous: false },
  { clef: "import", libelle: "Import", Icone: Upload, pourTous: false },
];

// La coquille commune : une barre haute qui ne bouge pas, et une colonne de
// contenu. Les trois ecrans partagent la meme, pour qu'on sache toujours ou on
// se trouve et comment en sortir.
export default function Coquille({
  profil,
  vue,
  onNaviguer,
  onDeconnexion,
  estSuperAdmin,
  large,
  children,
}) {
  const onglets = ONGLETS.filter((o) => o.pourTous || estSuperAdmin);

  return (
    <div
      style={{
        fontFamily: POLICE_TEXTE,
        minHeight: "100vh",
        background: FOND_NUIT,
        backgroundAttachment: "fixed",
        color: C.encre,
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          background: "rgba(3, 6, 15, 0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: `1px solid ${C.bordure}`,
        }}
      >
        <div
          className="flex items-center justify-between"
          style={{
            maxWidth: large ? 1180 : 940,
            margin: "0 auto",
            padding: "12px 20px",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <div className="flex items-center" style={{ gap: 11, minWidth: 0 }}>
            <img
              src="./logo_xgs.png"
              alt="Xperience Global Services"
              style={{ width: 30, height: 30, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontFamily: POLICE_TITRE,
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: C.encre,
                  lineHeight: 1.2,
                }}
              >
                Mon salaire
              </div>
              {profil?.nom && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: C.encre3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {profil.nom}
                </div>
              )}
            </div>
          </div>

          <nav className="flex items-center" style={{ gap: 6, flexWrap: "wrap" }}>
            {onglets.map(({ clef, libelle, Icone }) => {
              const actif = vue === clef;
              return (
                <button
                  key={clef}
                  type="button"
                  onClick={() => onNaviguer(clef)}
                  className="flex items-center gap-2"
                  style={{
                    ...boutonFantome,
                    background: actif ? C.soleilDoux : "transparent",
                    borderColor: actif ? "rgba(253, 207, 79, 0.35)" : C.bordure,
                    color: actif ? C.soleil : C.encre2,
                    fontWeight: actif ? 600 : 400,
                  }}
                >
                  <Icone size={13} /> {libelle}
                </button>
              );
            })}
            <button
              type="button"
              onClick={onDeconnexion}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              style={{ ...boutonFantome, padding: "8px 11px", color: C.encre3 }}
            >
              <LogOut size={13} />
            </button>
          </nav>
        </div>
      </header>

      <main
        style={{
          maxWidth: large ? 1180 : 940,
          margin: "0 auto",
          padding: "26px 20px 56px",
        }}
      >
        {children}
      </main>
    </div>
  );
}
