import { useEffect, useState } from "react";

// Les traces sont dessines a la largeur reelle de leur conteneur plutot que mis
// a l'echelle depuis un viewBox fixe : sinon les etiquettes deviennent
// illisibles sur un telephone.
export function useLargeur(reference) {
  const [largeur, setLargeur] = useState(0);

  useEffect(() => {
    const element = reference.current;
    if (!element) return undefined;

    const mesurer = () => setLargeur(element.getBoundingClientRect().width);
    mesurer();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", mesurer);
      return () => window.removeEventListener("resize", mesurer);
    }
    const observateur = new ResizeObserver(mesurer);
    observateur.observe(element);
    return () => observateur.disconnect();
  }, [reference]);

  return largeur;
}

// Des graduations rondes, et au plus cinq : 0 / 50 000 / 100 000 / 150 000 /
// 200 000 se lit, 0 / 45 500 / 91 000 non.
export function echelle(maximum) {
  const candidats = [
    1000, 2000, 5000, 10000, 20000, 25000, 50000, 100000, 200000, 250000, 500000,
    1000000, 2000000, 5000000,
  ];
  const pas = candidats.find((p) => maximum / p <= 4) || 10000000;
  return { haut: Math.max(Math.ceil(maximum / pas) * pas, pas), pas };
}

export function graduations(haut, pas) {
  const valeurs = [];
  for (let v = 0; v <= haut; v += pas) valeurs.push(v);
  return valeurs;
}

// Les axes portent des montants entiers, sans l'unite : elle est dans le titre
// de la section. Les milliers sont separes par une espace, comme partout ailleurs.
export function montantCourt(valeur) {
  return Math.round(valeur).toLocaleString("fr-FR").replace(/ | /g, " ");
}
