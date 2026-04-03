# Projet MI2-26 (Mofid)

Plateforme médecin/patient avec dashboards, RDV, avis, communauté, carte et IA (placeholder).

## Prérequis
- Node.js 20+ et npm
- Un projet Supabase (Postgres + Auth + Storage)

## Installation
### 1) Base de données (Supabase)
Exécuter les scripts SQL dans l'éditeur SQL Supabase dans l'ordre :
1. `back/database_setup.sql`
2. `back/02_database_extensions.sql`
3. `back/03_advanced_doctor_settings.sql`
4. `back/04_working_hours.sql`
5. `back/05_community_publications.sql`
6. `back/06_appointment_booking_modes.sql`
7. `back/07_moderation_observability.sql`
8. `back/08_bootstrap_test_env.sql` (optionnel pour tests)

Puis rafraîchir le schéma :
```
NOTIFY pgrst, 'reload schema';
```

### 2) Storage (Supabase)
Créer deux buckets publics :
- `profile-avatars`
- `community-posts`

Vérifier que la lecture publique est autorisée pour afficher les images.

### 3) Front-end
```
cd front
npm install
```

Créer un fichier `front/.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Lancer le front :
```
npm run dev
```

Accès local : `http://localhost:3000`

## Vérifications rapides
```
cd front
npm run lint
npx tsc --noEmit
```

Tests e2e (optionnel) :
```
cd front
npx playwright install
npm run test:e2e
```

## Notes
- Les clés `service_role` ne doivent jamais être exposées côté client.
- Si des colonnes manquent, relancer les scripts SQL puis `NOTIFY pgrst, 'reload schema';`.
