# Mon salaire — XGS

Consultation de son bulletin par l'agent : le total du mois, ce qui le compose,
et l'évolution mois par mois.

L'outil n'a ni base ni comptes à lui. On s'y connecte avec **son identifiant
Auréo**, et les bulletins sont lus dans le même projet Supabase qu'Auréo, table
`bulletins_salaire`. Un agent ne voit que ses propres lignes ; seul un
`super_admin` importe le classeur et voit tout le monde.

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

## Alimenter les bulletins chaque mois

Un `super_admin` ouvre « Importer un classeur » et dépose le `.xlsx` du mois.
L'outil lit chaque feuille nommée « Mois AAAA », montre ce qu'il a compris —
colonne de prime retenue, colonne de total, lignes laissées de côté et pourquoi —
et n'écrit qu'après confirmation. Un bulletin déjà présent pour le même agent et
le même mois est remplacé.

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
