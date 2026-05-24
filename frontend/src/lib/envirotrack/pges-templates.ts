// PGES measure templates per project type
// Used to seed PGESMeasure rows when a project is created.

export type Phase = 'PREPARATION' | 'CONSTRUCTION' | 'EXPLOITATION' | 'FERMETURE';

export type Composante = 'EAU' | 'AIR' | 'SOL' | 'BIODIVERSITE' | 'SOCIAL' | 'SANTE' | 'AUTRE';

export interface PGESMeasureTemplate {
  code: string;
  title: string;
  description: string;
  phase: Phase;
  composante: Composante;
  sortOrder: number;
}

// Universal measures applicable to ALL project types
export const UNIVERSAL_PGES: PGESMeasureTemplate[] = [
  // --- EAU ---
  {
    code: 'EAU-01',
    title: 'Protection des ressources en eau de surface',
    description:
      "Interdire le rejet direct d'eaux usées, d'huiles usagées et de polluants dans les cours d'eau et marigots. Installer des bacs de rétention autour des stockages d'hydrocarbures.",
    phase: 'CONSTRUCTION',
    composante: 'EAU',
    sortOrder: 100,
  },
  {
    code: 'EAU-02',
    title: 'Gestion des eaux de ruissellement du chantier',
    description:
      'Aménager des fossés de drainage et des bassins de décantation pour collecter les eaux de ruissellement chargées en MES avant rejet.',
    phase: 'CONSTRUCTION',
    composante: 'EAU',
    sortOrder: 110,
  },
  {
    code: 'EAU-03',
    title: "Surveillance de la qualité de l'eau",
    description:
      "Réaliser des analyses de la qualité de l'eau (pH, MES, hydrocarbures, métaux lourds) aux points de prélèvement identifiés, en début et fin de saison des pluies.",
    phase: 'EXPLOITATION',
    composante: 'EAU',
    sortOrder: 120,
  },

  // --- AIR ---
  {
    code: 'AIR-01',
    title: 'Réduction des émissions de poussières',
    description:
      'Arroser régulièrement les pistes de chantier et zones de terrassement (minimum 2x/jour par temps sec). Bâcher les camions de transport de matériaux.',
    phase: 'CONSTRUCTION',
    composante: 'AIR',
    sortOrder: 200,
  },
  {
    code: 'AIR-02',
    title: 'Contrôle des émissions des engins',
    description:
      "Assurer la maintenance régulière des engins et véhicules. Vérifier la conformité des émissions de gaz d'échappement. Utiliser des carburants de qualité conforme.",
    phase: 'CONSTRUCTION',
    composante: 'AIR',
    sortOrder: 210,
  },

  // --- SOL ---
  {
    code: 'SOL-01',
    title: 'Gestion de la couche arable',
    description:
      'Décaper et stocker séparément la couche arable (terre végétale) pour réutilisation lors de la réhabilitation des zones temporaires.',
    phase: 'PREPARATION',
    composante: 'SOL',
    sortOrder: 300,
  },
  {
    code: 'SOL-02',
    title: 'Gestion des déchets solides du chantier',
    description:
      'Mettre en place une filière de gestion des déchets : tri sélectif (DIB, déchets dangereux), transport vers décharge agréée. Interdire le brûlage à ciel ouvert.',
    phase: 'CONSTRUCTION',
    composante: 'SOL',
    sortOrder: 310,
  },
  {
    code: 'SOL-03',
    title: "Prévention des déversements d'hydrocarbures",
    description:
      "Stocker les hydrocarbures sur aire imperméabilisée avec rétention. Disposer d'un kit anti-pollution sur chaque engin. Former les chauffeurs aux procédures d'urgence.",
    phase: 'CONSTRUCTION',
    composante: 'SOL',
    sortOrder: 320,
  },
  {
    code: 'SOL-04',
    title: 'Réhabilitation des zones temporaires',
    description:
      "Remettre en état les zones d'installation de chantier, bases vie, zones d'emprunt après utilisation : nivellement, remplacement de la couche arable, revégétalisation.",
    phase: 'FERMETURE',
    composante: 'SOL',
    sortOrder: 330,
  },

  // --- BIODIVERSITE ---
  {
    code: 'BIO-01',
    title: "Limitation du déboisement à l'emprise stricte",
    description:
      "Matérialiser clairement les limites de l'emprise avant le démarrage des travaux. Interdire tout abattage hors emprise. Sensibiliser le personnel de chantier.",
    phase: 'PREPARATION',
    composante: 'BIODIVERSITE',
    sortOrder: 400,
  },
  {
    code: 'BIO-02',
    title: 'Compensation du déboisement',
    description:
      'Planter des espèces locales (ratio minimum 1:3) dans les zones dégradées conformément au Code Forestier togolais. Entretenir les plantations pendant 2 ans.',
    phase: 'CONSTRUCTION',
    composante: 'BIODIVERSITE',
    sortOrder: 410,
  },
  {
    code: 'BIO-03',
    title: 'Protection de la faune sauvage',
    description:
      'Interdire la chasse et le braconnage sur le chantier. Réduire les nuisances lumineuses nocturnes. Respecter les couloirs de faune identifiés.',
    phase: 'CONSTRUCTION',
    composante: 'BIODIVERSITE',
    sortOrder: 420,
  },

  // --- SOCIAL ---
  {
    code: 'SOC-01',
    title: "Recrutement prioritaire de la main-d'œuvre locale",
    description:
      "Affecter au moins 30% de la main-d'œuvre non qualifiée aux communautés riveraines. Travailler avec les autorités locales pour l'identification des candidats.",
    phase: 'CONSTRUCTION',
    composante: 'SOCIAL',
    sortOrder: 500,
  },
  {
    code: 'SOC-02',
    title: 'Indemnisation équitable des personnes affectées',
    description:
      "Réaliser l'inventaire des PAP, calculer les indemnisations selon le barème officiel et payer avant tout démarrage des travaux dans les zones concernées.",
    phase: 'PREPARATION',
    composante: 'SOCIAL',
    sortOrder: 510,
  },
  {
    code: 'SOC-03',
    title: 'Prévention des VBG et code de conduite',
    description:
      'Faire signer un code de conduite à tout le personnel. Former les équipes sur la prévention des VBG/EAS/HS. Mettre en place un mécanisme confidentiel de signalement.',
    phase: 'CONSTRUCTION',
    composante: 'SOCIAL',
    sortOrder: 520,
  },
  {
    code: 'SOC-04',
    title: 'Information continue des communautés',
    description:
      "Informer régulièrement les communautés sur l'avancement des travaux, les perturbations prévues et le mécanisme de gestion des plaintes via les canaux locaux.",
    phase: 'CONSTRUCTION',
    composante: 'SOCIAL',
    sortOrder: 530,
  },

  // --- SANTE ---
  {
    code: 'SAN-01',
    title: 'Prévention des IST/VIH sur le chantier',
    description:
      'Organiser des sessions de sensibilisation sur les IST/VIH pour tout le personnel. Mettre à disposition des préservatifs. Inclure un volet IEC dans le plan santé chantier.',
    phase: 'CONSTRUCTION',
    composante: 'SANTE',
    sortOrder: 600,
  },
  {
    code: 'SAN-02',
    title: 'Gestion des maladies hydriques et paludisme',
    description:
      "Contrôler les eaux stagnantes (gîtes larvaires). Fournir des moustiquaires imprégnées aux travailleurs résidents. Assurer l'accès à l'eau potable sur le chantier.",
    phase: 'CONSTRUCTION',
    composante: 'SANTE',
    sortOrder: 610,
  },
  {
    code: 'SAN-03',
    title: 'Sécurité et santé au travail (SST)',
    description:
      "Fournir les EPI adaptés à chaque poste. Afficher les consignes de sécurité. Réaliser des exercices de simulation d'urgence trimestriels. Tenir le registre des accidents.",
    phase: 'CONSTRUCTION',
    composante: 'SANTE',
    sortOrder: 620,
  },
  {
    code: 'SAN-04',
    title: 'Gestion des accidents de la route (riverains)',
    description:
      'Installer une signalisation adéquate aux abords du chantier. Limiter la vitesse des engins en zones habitées (20 km/h). Former les chauffeurs à la conduite sécurisée.',
    phase: 'CONSTRUCTION',
    composante: 'SANTE',
    sortOrder: 630,
  },
];

// Additional measures for ROUTE projects
export const ROUTE_PGES: PGESMeasureTemplate[] = [
  {
    code: 'RTE-01',
    title: 'Maintien de la circulation pendant les travaux',
    description:
      "Établir un plan de circulation alternatif. Assurer l'accès aux riverains et aux services d'urgence en permanence. Signaler les déviations par des panneaux réglementaires.",
    phase: 'CONSTRUCTION',
    composante: 'SOCIAL',
    sortOrder: 700,
  },
  {
    code: 'RTE-02',
    title: 'Protection des ouvrages hydrauliques existants',
    description:
      'Identifier et protéger les ouvrages de franchissement existants. Dimensionner les nouveaux ouvrages pour les crues décennales minimum.',
    phase: 'CONSTRUCTION',
    composante: 'EAU',
    sortOrder: 710,
  },
  {
    code: 'RTE-03',
    title: 'Stabilisation des talus et remblais',
    description:
      "Végétaliser les talus de déblais et remblais dans les 3 mois suivant leur mise en place pour prévenir l'érosion. Utiliser des espèces locales adaptées.",
    phase: 'CONSTRUCTION',
    composante: 'SOL',
    sortOrder: 720,
  },
];

// Additional measures for MINE projects
export const MINE_PGES: PGESMeasureTemplate[] = [
  {
    code: 'MIN-01',
    title: 'Gestion du drainage minier acide',
    description:
      "Surveiller le pH des eaux de ruissellement des haldes à stériles. Traiter les eaux acides avant rejet. Couvrir les haldes en fin d'exploitation.",
    phase: 'EXPLOITATION',
    composante: 'EAU',
    sortOrder: 700,
  },
  {
    code: 'MIN-02',
    title: 'Réhabilitation progressive des zones exploitées',
    description:
      "Réhabiliter au fur et à mesure les zones déjà exploitées (modelage, remplacement sol, revégétalisation). Ne pas attendre la fin de l'exploitation.",
    phase: 'EXPLOITATION',
    composante: 'SOL',
    sortOrder: 710,
  },
  {
    code: 'MIN-03',
    title: 'Surveillance des tassements et vibrations',
    description:
      "Installer des repères de tassement et sismographes. Surveiller les vibrations liées au tir à l'explosif et respecter les seuils réglementaires.",
    phase: 'EXPLOITATION',
    composante: 'AUTRE',
    sortOrder: 720,
  },
  {
    code: 'MIN-04',
    title: 'Réhabilitation finale du site minier',
    description:
      'Démanteler les infrastructures, combler les excavations ou les sécuriser, reconstituer la topographie, remettre en état les sols et revégétaliser selon le plan de fermeture approuvé.',
    phase: 'FERMETURE',
    composante: 'SOL',
    sortOrder: 730,
  },
];

// Additional measures for ENERGIE projects (hydraulique, solaire, éolien)
export const ENERGIE_PGES: PGESMeasureTemplate[] = [
  {
    code: 'ENE-01',
    title: 'Gestion du débit réservé (projets hydrauliques)',
    description:
      'Maintenir un débit réservé minimum en aval du barrage (minimum 10% du module inter-annuel) pour préserver les usages et la biodiversité aquatique.',
    phase: 'EXPLOITATION',
    composante: 'EAU',
    sortOrder: 700,
  },
  {
    code: 'ENE-02',
    title: "Surveillance de l'envasement du réservoir",
    description:
      "Mesurer le taux d'envasement annuellement. Mettre en œuvre des mesures de lutte contre l'érosion dans le bassin versant pour prolonger la durée de vie du réservoir.",
    phase: 'EXPLOITATION',
    composante: 'EAU',
    sortOrder: 710,
  },
  {
    code: 'ENE-03',
    title: 'Gestion des déchets de panneaux solaires (fin de vie)',
    description:
      "Prévoir un plan de collecte et de traitement des panneaux en fin de vie (25 ans). S'inscrire dans la filière de recyclage régionale ou internationale.",
    phase: 'FERMETURE',
    composante: 'AUTRE',
    sortOrder: 720,
  },
];

// Additional measures for AGRICULTURE projects
export const AGRICULTURE_PGES: PGESMeasureTemplate[] = [
  {
    code: 'AGR-01',
    title: 'Gestion des intrants agricoles (pesticides, fertilisants)',
    description:
      "N'utiliser que des pesticides homologués au Togo. Former les utilisateurs aux bonnes pratiques d'utilisation et aux EPI. Gérer les emballages vides selon les normes FAO.",
    phase: 'EXPLOITATION',
    composante: 'SOL',
    sortOrder: 700,
  },
  {
    code: 'AGR-02',
    title: "Gestion de l'irrigation et économie d'eau",
    description:
      "Installer des compteurs d'eau. Respecter les quotas d'irrigation fixés par l'autorité hydraulique. Promouvoir les techniques d'irrigation à haute efficience.",
    phase: 'EXPLOITATION',
    composante: 'EAU',
    sortOrder: 710,
  },
  {
    code: 'AGR-03',
    title: 'Protection des zones de conservation et bandes enherbées',
    description:
      "Maintenir des bandes enherbées de 10 m minimum en bordure de cours d'eau. Protéger les zones de forêt galerie et les corridors biologiques.",
    phase: 'EXPLOITATION',
    composante: 'BIODIVERSITE',
    sortOrder: 720,
  },
];

import type { ProjectType } from './checklist-templates';
export type { ProjectType };

export function getPGESForProject(type: ProjectType): PGESMeasureTemplate[] {
  const measures: PGESMeasureTemplate[] = [...UNIVERSAL_PGES];

  if (type === 'ROUTE') measures.push(...ROUTE_PGES);
  if (type === 'MINE') measures.push(...MINE_PGES);
  if (type === 'ENERGIE') measures.push(...ENERGIE_PGES);
  if (type === 'AGRICULTURE') measures.push(...AGRICULTURE_PGES);

  return measures.sort((a, b) => a.sortOrder - b.sortOrder);
}
