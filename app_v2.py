import streamlit as st
import pandas as pd
import openpyxl
import re
import unicodedata
import os

# ---------- Configuration ----------
st.set_page_config(page_title="Consultation des primes / salaires", page_icon="💰", layout="centered")

FICHIER_EXCEL = "ETAT_DES_PRIMES_Aout_2026.xlsx"
FEUILLES_IGNOREES = {"prime manager"}  # comparées en minuscule, sans accent

MOIS_FR = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre"
]


def sans_accent(texte):
    if not isinstance(texte, str):
        return ""
    nfkd = unicodedata.normalize("NFD", texte)
    return "".join(c for c in nfkd if unicodedata.category(c) != "Mn").lower().strip()


def extraire_mois_annee(nom_feuille):
    """Ex: 'Août 2026' -> ('Aout', 2026, index_mois)."""
    m = re.search(r"(\D+)\s*(\d{4})", nom_feuille)
    if not m:
        return nom_feuille, None, 99
    mot, annee = m.group(1).strip(), int(m.group(2))
    mot_norm = sans_accent(mot)
    idx = MOIS_FR.index(mot_norm) if mot_norm in MOIS_FR else 99
    return mot.strip().capitalize(), annee, idx


def trouver_ligne_entete(ws, max_lignes_scan=15):
    """Cherche la ligne contenant 'Matricule' ou 'Nom et prénoms'."""
    for r in range(1, max_lignes_scan + 1):
        valeurs = [sans_accent(ws.cell(row=r, column=c).value) for c in range(1, ws.max_column + 1)]
        if "matricule" in valeurs or any("nom et prenom" in v for v in valeurs):
            return r
    return None


def mapper_colonnes(ws, ligne_entete, mois_norm):
    """Associe chaque champ standard à un numéro de colonne, via correspondance souple sur l'intitulé."""
    mapping = {}
    for c in range(1, ws.max_column + 1):
        intitule = sans_accent(ws.cell(row=ligne_entete, column=c).value)
        if not intitule:
            continue
        if "matricule" in intitule:
            mapping["Matricule"] = c
        elif "nom et prenom" in intitule:
            mapping["Nom"] = c
        elif intitule == "projet" or "projet" in intitule:
            mapping.setdefault("Projet", c)
        elif "superviseur" in intitule:
            mapping["Superviseur"] = c
        elif intitule == "poste":
            mapping["Poste"] = c
        elif "salaire de base" in intitule:
            mapping["Salaire_Base"] = c
        elif "net a payer" in intitule and "total" not in intitule:
            mapping["Net_A_Payer"] = c
        elif "coach" in intitule:
            mapping["Prime_Coach"] = c
        elif "prime" in intitule:
            mapping["Prime_Anterieure"] = c
        elif "total" in intitule and mois_norm and mois_norm in intitule:
            mapping["Total_Mois"] = c
        elif "total" in intitule and "sans formule" in intitule:
            mapping.setdefault("Total_Mois_Precedent", c)
    return mapping


@st.cache_data(ttl=60)
def charger_donnees():
    if not os.path.exists(FICHIER_EXCEL):
        return None, []

    wb_valeurs = openpyxl.load_workbook(FICHIER_EXCEL, data_only=True)
    lignes = []
    feuilles_lues = []

    for nom_feuille in wb_valeurs.sheetnames:
        if sans_accent(nom_feuille) in FEUILLES_IGNOREES:
            continue

        mois_label, annee, ordre_mois = extraire_mois_annee(nom_feuille)
        if annee is None:
            continue  # feuille qui ne ressemble pas à un mois -> ignorée

        ws = wb_valeurs[nom_feuille]
        ligne_entete = trouver_ligne_entete(ws)
        if ligne_entete is None:
            continue

        mapping = mapper_colonnes(ws, ligne_entete, sans_accent(mois_label))
        if "Nom" not in mapping:
            continue

        feuilles_lues.append(nom_feuille)

        for r in range(ligne_entete + 1, ws.max_row + 1):
            nom = ws.cell(row=r, column=mapping["Nom"]).value
            if not nom or not str(nom).strip():
                continue  # ligne vide ou ligne de total en bas de tableau

            def val(champ):
                col = mapping.get(champ)
                return ws.cell(row=r, column=col).value if col else None

            matricule = val("Matricule")
            lignes.append({
                "Matricule": str(matricule).strip() if matricule not in (None, "") else None,
                "Nom": str(nom).strip(),
                "Mois": mois_label,
                "Annee": annee,
                "ordre_mois": ordre_mois,
                "Projet": val("Projet"),
                "Poste": val("Poste"),
                "Salaire_Base": val("Salaire_Base"),
                "Net_A_Payer": val("Net_A_Payer"),
                "Prime_Anterieure": val("Prime_Anterieure"),
                "Prime_Coach": val("Prime_Coach"),
                "Total_Mois": val("Total_Mois"),
            })

    if not lignes:
        return None, feuilles_lues

    df = pd.DataFrame(lignes)
    return df, feuilles_lues


def formater_fcfa(valeur):
    try:
        return f"{valeur:,.0f} FCFA".replace(",", " ")
    except (ValueError, TypeError):
        return "-" if valeur in (None, "") else valeur


# ---------- Interface ----------
st.title("💰 Consultation de mes primes / salaire")
st.caption("Entrez votre matricule pour consulter le détail, mois par mois. Cette vue est en lecture seule.")

df, feuilles_lues = charger_donnees()

if df is None:
    st.error(
        f"Impossible de trouver des données exploitables dans '{FICHIER_EXCEL}'. "
        "Vérifiez que le fichier est présent et que la colonne Matricule est bien remplie."
    )
    st.stop()

matricule_saisi = st.text_input("Votre matricule", placeholder="Ex : A001").strip()

if matricule_saisi:
    resultats = df[df["Matricule"] == matricule_saisi].copy()

    if resultats.empty:
        st.warning(
            "Aucune donnée trouvée pour ce matricule. "
            "Vérifiez la saisie, ou contactez le service RH si votre matricule n'a pas encore été renseigné."
        )
    else:
        nom_complet = resultats.iloc[0]["Nom"]
        st.success(f"Bienvenue, **{nom_complet}** (Matricule : {matricule_saisi})")

        resultats = resultats.sort_values(["Annee", "ordre_mois"])

        annees_disponibles = sorted(resultats["Annee"].dropna().unique().tolist(), reverse=True)
        annee_choisie = st.selectbox("Année", annees_disponibles) if len(annees_disponibles) > 1 else annees_disponibles[0]

        vue_annee = resultats[resultats["Annee"] == annee_choisie]

        colonnes_affichees = ["Mois", "Salaire_Base", "Net_A_Payer", "Prime_Anterieure", "Prime_Coach", "Total_Mois"]
        noms_lisibles = {
            "Mois": "Mois",
            "Salaire_Base": "Salaire de base",
            "Net_A_Payer": "Net à payer (hors primes)",
            "Prime_Anterieure": "Prime (mois précédent)",
            "Prime_Coach": "Prime coach métier",
            "Total_Mois": "Total du mois",
        }
        tableau = vue_annee[colonnes_affichees].rename(columns=noms_lisibles).reset_index(drop=True)

        for col in ["Salaire de base", "Net à payer (hors primes)", "Prime (mois précédent)", "Prime coach métier", "Total du mois"]:
            tableau[col] = tableau[col].apply(formater_fcfa)

        st.subheader(f"Détail par mois — {annee_choisie}")
        st.dataframe(tableau, hide_index=True, use_container_width=True)

        mois_disponibles = vue_annee["Mois"].tolist()
        mois_choisi = st.selectbox("Voir le détail d'un mois précis", mois_disponibles)
        ligne = vue_annee[vue_annee["Mois"] == mois_choisi].iloc[0]

        c1, c2, c3 = st.columns(3)
        c1.metric("Salaire de base", formater_fcfa(ligne["Salaire_Base"]))
        c2.metric("Net à payer", formater_fcfa(ligne["Net_A_Payer"]))
        c3.metric("Total du mois", formater_fcfa(ligne["Total_Mois"]))

        if ligne.get("Projet") or ligne.get("Poste"):
            st.caption(f"Projet : {ligne.get('Projet', '-')}  |  Poste : {ligne.get('Poste', '-')}")

st.divider()
st.caption("Cette page est en lecture seule : aucune donnée ne peut être modifiée depuis cette interface.")
