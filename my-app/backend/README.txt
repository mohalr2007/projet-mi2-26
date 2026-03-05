================================================================
  DOSSIER BACKEND
  Projet : Mofid | Date : 05/03/2026
================================================================

Ce dossier contient les copies des fichiers backend du projet.

STRUCTURE :
  made_by_mohamed/   -> Fichiers crees de zero par Mohamed
    utils/supabase/
      client.ts        -> Client Supabase navigateur (createBrowserClient)
      server.ts        -> Client Supabase serveur (createServerClient + cookies)
      auth.ts          -> Toutes les fonctions auth (signup, login, google, logout, updateProfile)
    app/auth/callback/
      route.ts         -> Route API OAuth : echange code -> session, redirige selon type de compte
    database/
      database_setup.sql -> Table profiles, RLS, trigger auto-profil

ATTENTION : Fichiers de REFERENCE uniquement.
Les vrais fichiers actifs sont dans src/ (dossier Next.js).
================================================================
