# RestoClik

Plateforme de commande et de livraison de repas à Ziguinchor, construite avec
React, TypeScript, TanStack Start, Bun et Supabase.

## Développement local

Prérequis : Bun.

```sh
bun install --frozen-lockfile
bun run dev
```

## Déploiement sur Railway

Le projet utilise Nitro avec le preset `node-server`, qui génère un serveur
Node.js autonome dans `.output`. Railway détecte Bun grâce à `bun.lock` et
utilise le script `start` du `package.json`.

1. Dans Railway, créez un projet puis choisissez **Deploy from GitHub repo**.
   Connectez GitHub et sélectionnez `By659/restoclick-render`.
2. Dans les paramètres du service, laissez le dossier racine par défaut.
   Configurez le build command `bun run build` et le start command
   `bun run start` si Railway ne les détecte pas automatiquement.
3. Ajoutez les variables Supabase dans l’onglet **Variables** du service :
   - `SUPABASE_URL` : URL de base du projet Supabase.
   - `SUPABASE_PUBLISHABLE_KEY` : clé publishable.
   - `SUPABASE_SERVICE_ROLE_KEY` : clé secrète utilisée uniquement par le
     serveur.
   - `VITE_SUPABASE_URL` : même URL de base.
   - `VITE_SUPABASE_PUBLISHABLE_KEY` : même clé publishable.
   - `VITE_SUPABASE_PROJECT_ID` : identifiant du projet Supabase.
4. Dans **Settings > Networking**, générez un domaine public pour le service.
   Railway fournit le port `PORT`; le serveur Nitro l’utilise automatiquement.
   L’endpoint de santé peut être défini sur `/`.
5. Dans Supabase, ouvrez **Authentication > URL Configuration**. Définissez
   l’URL Railway comme **Site URL** et ajoutez-la aux **Redirect URLs**.
6. Redéployez, puis testez l’accueil, l’inscription et connexion, la
   confirmation e-mail et les routes protégées `/admin` et `/restaurateur`.

Les valeurs des variables sont à saisir dans le tableau de bord Railway, pas
dans ce dépôt. Toute variable `VITE_*` est intégrée au code navigateur : elle
ne doit contenir que l’URL, la clé publishable ou le Project ID. Ne mettez
jamais la clé service role dans une variable `VITE_*`; elle contourne les
politiques RLS et doit rester une variable secrète du serveur Railway.

Le déploiement ne lance aucune migration Supabase. Vérifiez le projet Supabase
ciblé avant d’utiliser les fonctions qui écrivent dans la base.

### E-mail des candidatures

Avant de déployer la collecte de l’e-mail des candidats, exécutez
[`drizzle/migrations/0001_application_email.sql`](./drizzle/migrations/0001_application_email.sql)
une seule fois dans **Supabase > SQL Editor** sur le projet utilisé par Railway.
Cette migration ajoute une colonne facultative pour préserver les anciennes
candidatures ; les nouvelles candidatures doivent fournir une adresse e-mail.

Après acceptation, l’administration peut ouvrir un e-mail prérempli ou appeler
le candidat. L’e-mail n’est pas envoyé automatiquement : aucun fournisseur
d’envoi d’e-mails transactionnels n’est configuré. Le message indique au candidat
de s’inscrire avec l’adresse fournie. L’administration doit ensuite attribuer le
rôle et, pour un restaurateur, associer son compte au restaurant.

## Vérification locale

```sh
bun run test
bunx tsc --noEmit
bun run build
bun run start
```
