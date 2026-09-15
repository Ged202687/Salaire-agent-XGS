# Mon salaire — XGS

Consultation de son bulletin par l'agent : le total du mois, ce qui le compose,
et l'évolution mois par mois.

L'outil n'a ni base ni comptes à lui. On s'y connecte avec **son identifiant
Auréo**, et les bulletins sont lus dans le même projet Supabase qu'Auréo, table
`bulletins_salaire`. Un agent ne voit que ses propres lignes ; seul un
`super_admin` importe le classeur et voit tout le monde.

## La maquette

Bleu nuit XGS et jaune soleil du logo, comme l'écran de connexion d'Auréo :
surfaces de verre, chiffres éditoriaux en Space Grotesk, montants en IBM Plex
Mono pour que les colonnes s'alignent. Les jetons vivent dans
[`theme.js`](theme.js), personne ne code une couleur en dur.

Une règle à ne pas franchir : **le jaune est un accent d'interface, jamais une
couleur de donnée.** Il échoue à la bande de clarté du validateur de palette, donc
il mentirait sur un trait fin. La seule couleur de série est le bleu `#3987E5`,
validée sur la surface des cartes — bande de clarté, plancher de chroma,
contraste. Le PDF, lui, reste blanc : c'est du papier.

## Mise en route

```bash
npm install
npm run dev
```

## Déploiement

Même chaîne qu'Auréo — Cloudflare sert le dossier `dist` en fichiers statiques :

```bash
npm run build
npx wrangler deploy
```

## La table des bulletins

À créer une seule fois, dans l'éditeur SQL de Supabase :
[`supabase_bulletins_salaire.sql`](supabase_bulletins_salaire.sql). Le fichier
crée la table, l'index, et les politiques RLS.

## Le tableau de bord du super admin

« Tableau de bord » donne la vue d'ensemble : la masse salariale de la sélection
en chiffre principal, quatre tuiles (agents payés, moyenne par agent, part des
primes, nombre de bulletins), un graphe en colonnes de la masse salariale mois
par mois, et le tableau de tous les bulletins.

Les filtres — année, mois, agent, projet — cadrent le tout. Le filtre mois est
la seule exception : le graphe garde l'année entière sous les yeux et met le mois
choisi en avant, sinon il ne resterait qu'une colonne à regarder. Quand un seul
agent est sélectionné, l'écran parle de « total payé » et non de masse salariale.

Cet écran ne fait que lire. Ce qu'il montre, c'est ce que la base accepte de lui
donner : un agent qui l'atteindrait n'y verrait que ses propres lignes, la
politique RLS s'en charge — pas l'écran.

## Le bulletin PDF

Depuis son écran, l'agent télécharge le mois affiché en PDF. Le document est
construit dans le navigateur avec `pdf-lib` : texte vectoriel et sélectionnable,
pas une capture d'écran, puisque c'est une pièce qu'on présente à une banque ou à
un bailleur.

Il porte l'en-tête XGS, l'identité de l'agent, le détail du mois avec son total
en bandeau, puis **l'historique de l'année et son cumul** — qui s'allonge à chaque
import. Un relevé de plusieurs mois vaut mieux qu'un mois seul pour une démarche
administrative. Vérifié jusqu'à douze mois sur une seule page.

`pdf-lib` ne descend qu'au clic : un agent qui consulte son salaire sans
télécharger ne paie pas les 180 ko de la bibliothèque.

La mention de pied — « Édité le … à partir des états transmis par le service RH »
— est volontairement factuelle. Si le service RH veut une formule juridique
précise, elle se change dans [`bulletinPdf.js`](bulletinPdf.js).

## Alimenter les bulletins chaque mois

Un `super_admin` ouvre « Importer un classeur » et dépose le `.xlsx` du mois.
L'outil lit chaque feuille nommée « Mois AAAA », montre ce qu'il a compris —
colonne de prime retenue, colonne de total, lignes laissées de côté et pourquoi —
et n'écrit qu'après confirmation.

**On choisit les mois à écrire.** Le classeur de septembre contient aussi avril à
août ; une case par feuille décide de ce qui part en base, et les mois déjà
enregistrés sont décochés d'office — la colonne « Déjà en base » dit combien de
bulletins s'y trouvent. Cocher un mois déjà présent est possible, mais l'écran
prévient alors que ses bulletins seront remplacés. Sans ce garde-fou, redéposer
le classeur du mois réécrirait tout l'historique avec la version du moment.

Le rapprochement entre une ligne du classeur et un compte Auréo se fait sur la
colonne **login** si elle existe, sinon sur la colonne **matricule**. Le login est
la clef fiable : un matricule porté par deux comptes ne peut pas être départagé,
et ces lignes sont signalées plutôt qu'importées au hasard.

Le classeur ne vit jamais dans ce dépôt — `.gitignore` bloque les `.xlsx`.

## Ce que lit le classeur

Les intitulés de colonnes changent d'une feuille à l'autre, donc la lecture est
souple et vérifiée à l'import :

- le report du mois précédent s'appelle « Bonus avril », « Prime Mai »,
  « Prime Juillet »… — l'intitulé exact est conservé et réaffiché à l'agent, car
  il ne désigne pas le même mois selon le mois de paie ;
- « Total Juillet sans formule » est le report du mois précédent, pas le total du
  mois : il est testé avant « Total <mois> » ;
- une cellule vide reste vide (« - ») et ne devient pas zéro.
