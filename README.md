# RestoClik

Plateforme de commande et de livraison de repas à Ziguinchor, construite avec
React, TypeScript, TanStack Start, Bun et Supabase.

## Développement local

Prérequis : Bun et Node.js.

```sh
bun install --frozen-lockfile
bun run dev
```

## Déploiement sur Render

Le Blueprint [`render.yaml`](./render.yaml) crée un service web Node.js. Le
build utilise Nitro avec le preset `node-server`; le serveur est lancé par
`npm run start`.

1. Poussez le projet vers un dépôt GitHub auquel vous avez accès. Ne poussez
   jamais le fichier `.env` ni aucun secret.
2. Dans Render, choisissez **New > Blueprint**, puis connectez ce dépôt et
   sélectionnez son fichier `render.yaml`.
3. Lors de la création, renseignez les variables Supabase demandées :
   - `SUPABASE_URL` et `VITE_SUPABASE_URL` : URL de base du projet Supabase.
   - `SUPABASE_PUBLISHABLE_KEY` et `VITE_SUPABASE_PUBLISHABLE_KEY` : clé
     publishable du projet.
   - `SUPABASE_SERVICE_ROLE_KEY` : clé secrète destinée au serveur uniquement.
   - `VITE_SUPABASE_PROJECT_ID` : identifiant du projet Supabase.
4. Après la création du service, récupérez son URL `onrender.com`. Dans
   Supabase, ouvrez **Authentication > URL Configuration**, définissez cette
   URL comme **Site URL**, et ajoutez les URLs de redirection autorisées pour
   le domaine Render (ainsi que l'URL locale de développement si nécessaire).
5. Déployez et vérifiez l'URL du service, la connexion, la confirmation des
   e-mails et les routes protégées.

Les variables commençant par `VITE_` sont intégrées au code navigateur pendant
le build. Elles ne doivent contenir que l'URL et la clé publishable. Ne mettez
jamais la clé service role dans une variable `VITE_*`, dans le dépôt ou dans le
navigateur : elle contourne les politiques RLS et doit rester une variable
secrète du serveur Render.

Le déploiement ne lance aucune migration Supabase. Vérifiez séparément que le
service Supabase configuré est le projet de test attendu avant d'utiliser les
fonctions qui écrivent dans la base.

## Vérification locale

```sh
bun run test
bunx tsc --noEmit
bun run build
bun run start
```
