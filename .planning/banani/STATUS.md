# Banani implementation status

Last updated: 2026-05-22
Flow: Suivi EIES Mobile (yrnQI7Ryvvk6)

## Done

- [x] `shared-components` — `src/components/ui/progress-bar.tsx` + `src/components/ui/status-badge.tsx`
- [x] `dashboard` (screens 4 mobile + 2 desktop) — `src/app/(app)/dashboard/page.tsx`
  - Tabs : Mes Projets / Rapports ANGE / Mon Bureau
  - Barre de recherche client-side
  - Cartes projet avec ProgressBar + StatusBadge + compteur NC
  - Panneau stats desktop (lg: col-right)
  - FAB mobile "Nouveau projet"
  - Projets archivés en `<details>` repliable
- [x] `eies-editor` (screen 3) — `src/app/(app)/projects/[id]/eies/page.tsx`
  - Section cards avec badges COMPLETE/DRAFT/EMPTY
  - Alerte ANGE (bandeau amber) sur sections DRAFT
  - Bannière guide "Saisie automatisée"
  - Barre d'action bas avec lien vers Rapport
- [x] `pges-tracker` (screen 1) — `src/app/(app)/projects/[id]/pges/page.tsx`
  - Bannière hors-ligne (`navigator.onLine` réel)
  - Cartes mesures : badge CONFORME / NON-CONFORME / PARTIEL / N/É
  - Alertes inline rouge (non-conforme) et amber (partiel)
  - Filtre phase pills
  - Indicateur trimestre en cours
  - Expand/collapse détails mesure
  - Panel d'action bas "Ajouter un écart"
  - Modal d'évaluation redesigné

- [x] `eies-section-editor` — `src/app/(app)/projects/[id]/eies/[section]/page.tsx`
  - Section header card avec numéro circulaire, titre, article, badge statut
  - Progress dots navigation (sections 1–9) avec lien direct
  - Chaque champ dans sa propre carte blanche
  - Barre d'action fixe bas mobile / statique desktop
  - Prev/Next navigation + "Marquer terminé" en `#123C24`
- [x] `app-layout` — `src/app/(app)/layout.tsx`
  - Logo EnviroTrack avec icône Leaf + carré `#123C24`
  - Nav items avec icônes lucide-react (LayoutDashboard, FolderPlus, Building2, Users, CreditCard)
  - Active state : `bg-[#123C24]/10 text-[#123C24]`
  - Logout avec icône LogOut
  - Mobile top bar : Menu/X toggle + avatar initiale
  - Sidebar se ferme automatiquement au changement de route

## Pending

_(aucun — toutes les vues Banani sont implémentées)_

## Notes design

- Couleur primaire : `#123C24` (vert forêt sombre)
- Lucide-react installé comme bibliothèque d'icônes
- Erreurs TypeScript pré-existantes dans `apify/sync.ts` (non liées à ces changements)
