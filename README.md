# RestoClik

Plateforme de commande et de livraison de repas à Ziguinchor, construite avec
React, TypeScript, TanStack Start, Bun et Supabase.

## Développement local

Prérequis : Bun.

```sh
bun install --frozen-lockfile
bun run dev
```

## Déploiement sur Vercel

Le projet utilise Nitro avec son preset Vercel.

1. Dans Vercel, choisissez **Add New > Project**, puis importez le dépôt GitHub
   `By659/restoclick-render`.
2. Gardez le dossier racine comme **Root Directory** et le framework configuré
   automatiquement. La commande de build est `bun run build`.
3. Dans **Settings > Environment Variables**, ajoutez les variables Supabase
   suivantes pour les environnements souhaités (Production, Preview et/ou
   Development) :
   - `SUPABASE_URL` : URL de base du projet Supabase.
   - `SUPABASE_PUBLISHABLE_KEY` : clé publishable.
   - `SUPABASE_SERVICE_ROLE_KEY` : clé secrète utilisée uniquement par le
     serveur.
   - `VITE_SUPABASE_URL` : même URL de base.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` : même clé publishable.
   - `VITE_SUPABASE_PROJECT_ID` : identifiant du projet Supabase.
4. Redéployez après avoir ajouté ou modifié les variables.
5. Dans Supabase, ouvrez **Authentication > URL Configuration**. Définissez
   l’URL de production Vercel comme **Site URL** et ajoutez les domaines Vercel
   nécessaires aux **Redirect URLs** (production, previews utilisées et
   localhost pour le développement local).
6. Testez l’accueil, l’inscription et connexion, la confirmation e-mail, puis
   les routes protégées `/admin` et `/restaurateur`.

Les valeurs des variables sont à saisir dans le tableau de bord Vercel, pas
dans ce dépôt. Toute variable `VITE_*` est intégrée au code navigateur : elle
ne doit contenir que l’URL, la clé publishable ou le Project ID. Ne mettez
jamais la clé service role dans une variable `VITE_*`; elle contourne les
politiques RLS et doit rester une variable secrète du serveur.

Le déploiement ne lance aucune migration Supabase. Vérifiez le projet Supabase
ciblé avant d’utiliser les fonctions qui écrivent dans la base.

## Vérification locale

```sh
bun run test
bunx tsc --noEmit
bun run build
bun run start
```
