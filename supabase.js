// Meme projet Supabase qu'Aureo : l'outil ne cree aucun compte et ne gere aucun
// mot de passe. On se connecte avec l'identifiant Aureo, et la table profils dit
// qui est l'agent.
const SUPABASE_URL = "https://fipvndiueabrehsmqxth.supabase.co";
const SUPABASE_KEY = "sb_publishable_aNR2zGeJS9UgYLnvsvtVaw_tItHLC10";
const SUPABASE_ANON_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpcHZuZGl1ZWFicmVoc21xeHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTA0MjUsImV4cCI6MjEwMjcyNjQyNX0.PTPShNDncsT793-fBMP-Ko2gk3trOGtuwWYQ3L450j8";

export async function supaAuth(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.msg || data.error || "Erreur d'authentification");
  }
  return data;
}

export async function supaRest(path, { method = "GET", accessToken, body, prefer } = {}) {
  const entetes = {
    "Content-Type": "application/json",
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
  };
  if (prefer) entetes.Prefer = prefer;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: entetes,
    body: body ? JSON.stringify(body) : undefined,
  });
  const texte = await res.text();
  let data = null;
  if (texte) {
    try {
      data = JSON.parse(texte);
    } catch {
      throw new Error(
        res.ok ? "Réponse inattendue du serveur." : `Requête rejetée (${res.status}).`
      );
    }
  }
  if (!res.ok) throw new Error(data?.message || data?.error || "Erreur Supabase");
  return data;
}

export async function rpc(nom, accessToken, args) {
  return supaRest(`rpc/${nom}`, { method: "POST", accessToken, body: args });
}

export { SUPABASE_ANON_JWT };

// --- Session conservee entre deux rechargements de page ---------------------
const CLE_SESSION = "salaire-xgs-session";

export function lireSessionStockee() {
  try {
    const brut = sessionStorage.getItem(CLE_SESSION);
    return brut ? JSON.parse(brut) : null;
  } catch {
    return null;
  }
}

export function ecrireSessionStockee(session) {
  try {
    sessionStorage.setItem(
      CLE_SESSION,
      JSON.stringify({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        userId: session.user.id,
      })
    );
  } catch {
    // Navigation privee ou stockage refuse : la session vit alors le temps de
    // l'onglet, ce qui est acceptable pour une consultation de bulletin.
  }
}

export function effacerSessionStockee() {
  try {
    sessionStorage.removeItem(CLE_SESSION);
  } catch {
    // rien a faire
  }
}
