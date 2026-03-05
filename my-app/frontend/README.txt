================================================================
  DOSSIER FRONTEND
  Projet : Mofid | Date : 05/03/2026
================================================================

Ce dossier contient les copies des fichiers frontend du projet.

STRUCTURE :
  made_by_mohamed/   -> Fichiers crees de zero par Mohamed
    app/auth/auth-error/
      page.tsx             -> Page d'erreur si Google OAuth echoue
    app/dashboardoctlarabi/
      page.tsx             -> Dashboard provisoire Docteur (// made by mohamed)
    app/dashboardpatientlarabi/
      page.tsx             -> Dashboard provisoire Patient (// made by mohamed)

  app/               -> Fichiers de l'equipe (existants avant / modifies par Mohamed)
    login/page.tsx         -> Page de connexion (state, submit, redirection)
    signup/page.tsx        -> Page inscription + completion profil Google

  components/        -> Composants de l'equipe (modifies par Mohamed)
    AnimatedInput.tsx      -> Ajout props value, onChange, disabled
    AnimatedButton.tsx     -> Non modifie
    Logo.tsx               -> Non modifie

ATTENTION : Fichiers de REFERENCE uniquement.
Les vrais fichiers actifs sont dans src/ (dossier Next.js).
================================================================
