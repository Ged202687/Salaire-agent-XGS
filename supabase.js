import { createClient } from "@supabase/supabase-js";

// Meme projet Supabase qu'Aureo : l'outil ne cree aucun compte et ne gere aucun
// mot de passe. On se connecte avec l'identifiant Aureo, et la table profils dit
// qui est l'agent.
const SUPABASE_URL = "https://fipvndiueabrehsmqxth.supabase.co";
const SUPABASE_KEY = "sb_publishable_aNR2zGeJS9UgYLnvsvtVaw_tItHLC10";
const SUPABASE_ANON_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpcHZuZGl1ZWFicmVoc21xeHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNTA0MjUsImV4cCI6MjEwMjcyNjQyNX0.PTPShNDncsT793-fBMP-Ko2gk3trOGtuwWYQ3L450j8";

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

// --- Session partagee avec le portail XGS -----------------------------------
// La session est gardee par le client officiel Supabase, sous sa cle standard
// (sb-<projet>-auth-token), la meme que le portail, Auréo, Méridien et Horizon.
// Servi a la meme adresse que le portail (portail/salaire/), l'outil retrouve
// donc la connexion faite sur le portail.
//
// Le client renouvelle aussi le jeton lui-meme, en se coordonnant entre les
// onglets et les outils ouverts : deux outils qui renouvelleraient chacun la
// meme session seraient pris par Supabase pour un vol de jeton, et l'agent
// serait deconnecte partout.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
});

// Mon salaire ouvert depuis le portail plutot qu'a sa propre adresse : la
// connexion et la deconnexion se font alors sur le portail.
export const SOUS_PORTAIL =
  typeof window !== "undefined" && /^\/salaire(\/|$)/.test(window.location.pathname);

export function allerAuPortail() {
  window.location.replace(`/?retour=${encodeURIComponent(window.location.pathname)}`);
}

// Ancienne session de l'outil (propre a l'onglet), effacee a la premiere
// ouverture apres la mise a jour.
export function effacerAncienneSession() {
  try {
    sessionStorage.removeItem("salaire-xgs-session");
  } catch {
    // rien a faire
  }
}
