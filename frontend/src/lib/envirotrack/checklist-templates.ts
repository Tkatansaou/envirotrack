// Regulatory checklist items per Loi 2008-005 + Décret 2017-040/PR (Togo)
// Used to seed ChecklistItem rows when a project is created.

export type ChecklistCategory = 'TDR' | 'EIES' | 'PGES' | 'CONSULTATION' | 'ADMINISTRATIF';

export interface ChecklistTemplate {
  code: string;
  article: string;
  description: string;
  category: ChecklistCategory;
  sortOrder: number;
}

// Universal items applicable to ALL project types
export const UNIVERSAL_CHECKLIST: ChecklistTemplate[] = [
  // --- ADMINISTRATIF ---
  {
    code: 'ADM-001',
    article: 'Art. 4 Décret 2017-040',
    description: "Dépôt de la demande d'agrément EIES auprès de l'ANGE avec dossier complet",
    category: 'ADMINISTRATIF',
    sortOrder: 10,
  },
  {
    code: 'ADM-002',
    article: 'Art. 5 Décret 2017-040',
    description: "Désignation du bureau d'études agréé par l'ANGE pour la réalisation de l'EIES",
    category: 'ADMINISTRATIF',
    sortOrder: 20,
  },
  {
    code: 'ADM-003',
    article: 'Art. 12 Décret 2017-040',
    description:
      'Obtention du Certificat de Conformité Environnementale (CCE) avant démarrage des travaux',
    category: 'ADMINISTRATIF',
    sortOrder: 30,
  },
  {
    code: 'ADM-004',
    article: 'Art. 18 Décret 2017-040',
    description: "Transmission du rapport EIES final à l'ANGE pour validation",
    category: 'ADMINISTRATIF',
    sortOrder: 40,
  },
  {
    code: 'ADM-005',
    article: 'Art. 22 Loi 2008-005',
    description: "Affichage public de l'avis de projet dans la zone d'influence du projet",
    category: 'ADMINISTRATIF',
    sortOrder: 50,
  },

  // --- TDR ---
  {
    code: 'TDR-001',
    article: 'Art. 7 Décret 2017-040',
    description:
      "Les Termes de Référence (TDR) soumis et validés par l'ANGE avant le démarrage de l'EIES",
    category: 'TDR',
    sortOrder: 100,
  },
  {
    code: 'TDR-002',
    article: 'Art. 7 Décret 2017-040',
    description: "Les TDR précisent les alternatives à analyser et les zones d'étude à couvrir",
    category: 'TDR',
    sortOrder: 110,
  },
  {
    code: 'TDR-003',
    article: 'Art. 7 Décret 2017-040',
    description: 'Les TDR définissent les méthodes de consultation et de participation du public',
    category: 'TDR',
    sortOrder: 120,
  },
  {
    code: 'TDR-004',
    article: 'Art. 8 Décret 2017-040',
    description:
      "Composition de l'équipe pluridisciplinaire du bureau d'études précisée dans les TDR",
    category: 'TDR',
    sortOrder: 130,
  },

  // --- EIES (Contenu rapport) ---
  {
    code: 'EIES-001',
    article: 'Art. 9 Décret 2017-040',
    description: 'Description détaillée du projet incluant localisation, calendrier et coûts',
    category: 'EIES',
    sortOrder: 200,
  },
  {
    code: 'EIES-002',
    article: 'Art. 9 Décret 2017-040',
    description: "État initial de l'environnement (baseline) documenté avec données quantifiées",
    category: 'EIES',
    sortOrder: 210,
  },
  {
    code: 'EIES-003',
    article: 'Art. 9 Décret 2017-040',
    description:
      'Identification et évaluation de tous les impacts significatifs (positifs et négatifs)',
    category: 'EIES',
    sortOrder: 220,
  },
  {
    code: 'EIES-004',
    article: 'Art. 9 Décret 2017-040',
    description: 'Analyse des alternatives étudiées avec justification du choix retenu',
    category: 'EIES',
    sortOrder: 230,
  },
  {
    code: 'EIES-005',
    article: 'Art. 9 Décret 2017-040',
    description: "PGES complet avec mesures d'atténuation, responsabilités, coûts et indicateurs",
    category: 'EIES',
    sortOrder: 240,
  },
  {
    code: 'EIES-006',
    article: 'Art. 9 Décret 2017-040',
    description: 'Plan de surveillance et de suivi environnemental inclus dans le rapport EIES',
    category: 'EIES',
    sortOrder: 250,
  },
  {
    code: 'EIES-007',
    article: 'Art. 9 Décret 2017-040',
    description: 'Résumé non technique rédigé en français accessible au grand public',
    category: 'EIES',
    sortOrder: 260,
  },

  // --- CONSULTATION ---
  {
    code: 'CONS-001',
    article: 'Art. 14 Loi 2008-005',
    description: 'Réunion de consultation publique organisée avec les communautés affectées',
    category: 'CONSULTATION',
    sortOrder: 300,
  },
  {
    code: 'CONS-002',
    article: 'Art. 14 Loi 2008-005',
    description: 'Procès-verbaux de consultation signés et annexés au rapport EIES',
    category: 'CONSULTATION',
    sortOrder: 310,
  },
  {
    code: 'CONS-003',
    article: 'Art. 15 Loi 2008-005',
    description:
      'Consultations des administrations sectorielles concernées (agriculture, santé, eau…)',
    category: 'CONSULTATION',
    sortOrder: 320,
  },
  {
    code: 'CONS-004',
    article: 'Art. 16 Loi 2008-005',
    description: 'Liste de présence et photos des séances de consultation publique disponibles',
    category: 'CONSULTATION',
    sortOrder: 330,
  },

  // --- PGES ---
  {
    code: 'PGES-001',
    article: 'Art. 20 Décret 2017-040',
    description: 'Mécanisme de gestion des plaintes mis en place avant démarrage des travaux',
    category: 'PGES',
    sortOrder: 400,
  },
  {
    code: 'PGES-002',
    article: 'Art. 20 Décret 2017-040',
    description: "Rapport de mise en œuvre du PGES transmis à l'ANGE selon la périodicité prévue",
    category: 'PGES',
    sortOrder: 410,
  },
  {
    code: 'PGES-003',
    article: 'Art. 21 Décret 2017-040',
    description: "Responsable environnement désigné par le maître d'ouvrage pour le suivi du PGES",
    category: 'PGES',
    sortOrder: 420,
  },
  {
    code: 'PGES-004',
    article: 'Art. 21 Décret 2017-040',
    description:
      'Budget PGES intégré dans le budget global du projet et dédié au suivi environnemental',
    category: 'PGES',
    sortOrder: 430,
  },
];

// Additional items for MINE projects (secteur minier)
export const MINE_EXTRA_CHECKLIST: ChecklistTemplate[] = [
  {
    code: 'MINE-001',
    article: 'Art. 42 Code Minier Togo',
    description: 'Plan de réhabilitation et fermeture du site minier inclus dans le dossier EIES',
    category: 'EIES',
    sortOrder: 500,
  },
  {
    code: 'MINE-002',
    article: 'Art. 43 Code Minier Togo',
    description: 'Étude hydrogéologique de la zone minière réalisée et annexée au rapport',
    category: 'EIES',
    sortOrder: 510,
  },
  {
    code: 'MINE-003',
    article: 'Art. 44 Code Minier Togo',
    description: 'Plan de gestion des rejets miniers (stériles, boues, eaux acides) fourni',
    category: 'PGES',
    sortOrder: 520,
  },
  {
    code: 'MINE-004',
    article: 'Art. 45 Code Minier Togo',
    description:
      'Provision financière pour la réhabilitation constituée (garantie bancaire ou autre)',
    category: 'ADMINISTRATIF',
    sortOrder: 530,
  },
];

// Additional items for ENERGIE projects (barrages, solaire, éolien)
export const ENERGIE_EXTRA_CHECKLIST: ChecklistTemplate[] = [
  {
    code: 'ENE-001',
    article: 'Directives BM OP 4.01',
    description: "Étude d'impact hydrologique en aval pour les projets hydrauliques",
    category: 'EIES',
    sortOrder: 500,
  },
  {
    code: 'ENE-002',
    article: 'Directives BM OP 4.04',
    description: 'Évaluation de la biodiversité aquatique et terrestre dans la zone de retenue',
    category: 'EIES',
    sortOrder: 510,
  },
  {
    code: 'ENE-003',
    article: 'Directives BM OP 4.12',
    description: "Plan d'Action de Réinstallation (PAR) si des personnes sont déplacées",
    category: 'PGES',
    sortOrder: 520,
  },
];

// Additional items for BAILLEUR-financed projects (international financiers)
export const BAILLEUR_EXTRA_CHECKLIST: ChecklistTemplate[] = [
  {
    code: 'BAIL-001',
    article: 'Directives BM/BAD',
    description: 'Rapport EIES conforme aux standards environnementaux et sociaux du bailleur',
    category: 'EIES',
    sortOrder: 600,
  },
  {
    code: 'BAIL-002',
    article: 'Directives BM/BAD',
    description: "Plan d'engagement des parties prenantes (PEPP/SEP) élaboré",
    category: 'CONSULTATION',
    sortOrder: 610,
  },
  {
    code: 'BAIL-003',
    article: 'Directives BM/BAD',
    description: 'Mécanisme de règlement des griefs (MRG) opérationnel avant démarrage travaux',
    category: 'PGES',
    sortOrder: 620,
  },
  {
    code: 'BAIL-004',
    article: 'NES 1 Cadre Env. Social',
    description:
      'Évaluation des risques et impacts E&S selon les Normes Environnementales et Sociales (NES)',
    category: 'EIES',
    sortOrder: 630,
  },
  {
    code: 'BAIL-005',
    article: 'NES 10 Mobilisation',
    description: 'Rapport de mobilisation des parties prenantes soumis au bailleur',
    category: 'CONSULTATION',
    sortOrder: 640,
  },
];

export type ProjectType = 'ROUTE' | 'BATIMENT' | 'MINE' | 'ENERGIE' | 'AGRICULTURE' | 'AUTRE';

export function getChecklistForProject(
  type: ProjectType,
  financement: 'STANDARD' | 'BAILLEUR',
): ChecklistTemplate[] {
  const items: ChecklistTemplate[] = [...UNIVERSAL_CHECKLIST];

  if (type === 'MINE') items.push(...MINE_EXTRA_CHECKLIST);
  if (type === 'ENERGIE') items.push(...ENERGIE_EXTRA_CHECKLIST);
  if (financement === 'BAILLEUR') items.push(...BAILLEUR_EXTRA_CHECKLIST);

  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}
