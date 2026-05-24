// 9 sections EIES per Décret 2017-040/PR (Togo)
// Each section has guided fields (questions) to help the user fill in content.

export interface EIESField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'list';
  placeholder?: string;
  options?: string[];
  required?: boolean;
  hint?: string;
}

export interface EIESSectionDef {
  sectionNumber: number;
  title: string;
  description: string;
  article: string;
  fields: EIESField[];
}

export const EIES_SECTIONS: EIESSectionDef[] = [
  {
    sectionNumber: 1,
    title: 'Résumé non technique',
    description: "Synthèse accessible au grand public des principaux résultats de l'EIES",
    article: 'Art. 9.1 Décret 2017-040',
    fields: [
      {
        key: 'contexte_projet',
        label: 'Contexte et justification du projet',
        type: 'textarea',
        placeholder: 'Décrivez brièvement le contexte et la nécessité du projet…',
        required: true,
        hint: 'Max 300 mots. Accessible à un lecteur non spécialiste.',
      },
      {
        key: 'principaux_impacts',
        label: 'Principaux impacts identifiés',
        type: 'textarea',
        placeholder: 'Listez les 5 à 10 impacts les plus significatifs…',
        required: true,
      },
      {
        key: 'mesures_cles',
        label: "Mesures d'atténuation clés retenues",
        type: 'textarea',
        placeholder: 'Résumez les mesures principales du PGES…',
        required: true,
      },
      {
        key: 'cout_pges',
        label: 'Coût estimatif du PGES (FCFA)',
        type: 'number',
        placeholder: '0',
        hint: 'Budget dédié à la mise en œuvre du PGES',
      },
      {
        key: 'conclusion',
        label: 'Conclusion et recommandations',
        type: 'textarea',
        placeholder: "Conclusion générale sur l'acceptabilité environnementale du projet…",
      },
    ],
  },
  {
    sectionNumber: 2,
    title: 'Description du projet',
    description: 'Présentation complète du projet : localisation, composantes, calendrier et coûts',
    article: 'Art. 9.2 Décret 2017-040',
    fields: [
      {
        key: 'nom_projet',
        label: 'Dénomination officielle du projet',
        type: 'text',
        required: true,
        placeholder: 'Ex. : Construction de la route nationale RN2 tronçon Atakpamé-Sokodé',
      },
      {
        key: 'localisation',
        label: 'Localisation géographique (région, préfecture, canton, coordonnées GPS)',
        type: 'textarea',
        required: true,
        placeholder: 'Région : …\nPréfecture : …\nCoordonnées GPS : N…° E…°',
      },
      {
        key: 'superficie',
        label: "Superficie de la zone d'emprise (ha)",
        type: 'number',
        placeholder: '0.00',
      },
      {
        key: 'objectifs',
        label: 'Objectifs du projet',
        type: 'textarea',
        required: true,
        placeholder: 'Décrivez les objectifs principaux (économiques, sociaux, techniques)…',
      },
      {
        key: 'composantes',
        label: 'Description des composantes du projet',
        type: 'textarea',
        required: true,
        placeholder:
          'Listez et décrivez chaque composante (infrastructures, équipements, services)…',
      },
      {
        key: 'technologies',
        label: 'Technologies et procédés utilisés',
        type: 'textarea',
        placeholder:
          'Décrivez les technologies, matériaux et procédés de construction/exploitation…',
      },
      {
        key: 'calendrier_preparation',
        label: 'Durée de la phase de préparation (mois)',
        type: 'number',
        placeholder: '0',
      },
      {
        key: 'calendrier_construction',
        label: 'Durée de la phase de construction (mois)',
        type: 'number',
        placeholder: '0',
      },
      {
        key: 'calendrier_exploitation',
        label: 'Durée de vie prévue du projet (années)',
        type: 'number',
        placeholder: '0',
      },
      {
        key: 'cout_total',
        label: 'Coût total du projet (FCFA)',
        type: 'number',
        placeholder: '0',
      },
      {
        key: 'maitre_ouvrage',
        label: "Maître d'ouvrage",
        type: 'text',
        required: true,
        placeholder: "Nom de l'entité commanditaire du projet",
      },
      {
        key: 'financement',
        label: 'Source de financement',
        type: 'textarea',
        placeholder: "Ex. : Budget de l'État / Banque Mondiale / BAD / …",
      },
      {
        key: 'ressources_necessaires',
        label: 'Ressources naturelles utilisées',
        type: 'textarea',
        placeholder: 'Eau, matériaux (gravier, sable, bois), énergie, foncier…',
      },
      {
        key: 'main_oeuvre',
        label: "Besoins en main-d'œuvre (nombre d'emplois)",
        type: 'textarea',
        placeholder:
          'Phase construction : … emplois directs, … emplois indirects\nPhase exploitation : …',
      },
    ],
  },
  {
    sectionNumber: 3,
    title: 'Cadre politique, juridique et institutionnel',
    description:
      'Textes législatifs et réglementaires applicables au projet et au secteur concerné',
    article: 'Art. 9.3 Décret 2017-040',
    fields: [
      {
        key: 'lois_nationales',
        label: 'Législation nationale applicable',
        type: 'textarea',
        required: true,
        placeholder:
          "Loi 2008-005 portant loi-cadre sur l'environnement\nDécret 2017-040/PR\nCode Forestier, Code de l'Eau, Code Foncier…",
      },
      {
        key: 'conventions_internationales',
        label: 'Conventions internationales ratifiées par le Togo',
        type: 'textarea',
        placeholder:
          'Convention sur la diversité biologique (1992)\nConvention-cadre des Nations Unies sur les changements climatiques\nConvention de Ramsar…',
      },
      {
        key: 'politiques_bailleurs',
        label: 'Politiques opérationnelles des bailleurs (si applicable)',
        type: 'textarea',
        placeholder: 'OP 4.01 Évaluation Environnementale (BM)\nPolitique environnementale BAD…',
      },
      {
        key: 'institutions_concernees',
        label: 'Institutions responsables du suivi',
        type: 'textarea',
        required: true,
        placeholder:
          "ANGE (Agence Nationale de Gestion de l'Environnement)\nMinistère de l'Environnement\nMinistère de tutelle sectorielle…",
      },
      {
        key: 'plans_amenagement',
        label: "Plans et schémas d'aménagement en vigueur",
        type: 'textarea',
        placeholder: "SNAT, PNAT, Schéma directeur régional, Plan local d'urbanisme…",
      },
    ],
  },
  {
    sectionNumber: 4,
    title: "Description de l'environnement initial",
    description:
      "État de référence (baseline) de l'environnement biophysique et socio-économique avant le projet",
    article: 'Art. 9.4 Décret 2017-040',
    fields: [
      // Milieu physique
      {
        key: 'climatologie',
        label: 'Climatologie (température, pluviométrie, vents)',
        type: 'textarea',
        required: true,
        placeholder:
          'Données climatiques de la station météo la plus proche (source, période, moyennes)…',
      },
      {
        key: 'geologie_sols',
        label: 'Géologie et types de sols',
        type: 'textarea',
        required: true,
        placeholder: "Formations géologiques, nature des sols, risques d'érosion…",
      },
      {
        key: 'hydrologie',
        label: 'Hydrologie et hydrogéologie',
        type: 'textarea',
        required: true,
        placeholder: "Cours d'eau, bassins versants, nappes phréatiques, qualité de l'eau…",
      },
      {
        key: 'topographie',
        label: 'Topographie et relief',
        type: 'textarea',
        placeholder: 'Altitude, pentes, relief, zones inondables…',
      },
      // Milieu biologique
      {
        key: 'vegetation',
        label: 'Végétation et occupation des terres',
        type: 'textarea',
        required: true,
        placeholder: 'Type de végétation, espèces dominantes, présence de zones protégées…',
      },
      {
        key: 'faune',
        label: 'Faune terrestre et aquatique',
        type: 'textarea',
        placeholder: 'Espèces présentes, espèces protégées ou menacées (UICN), habitats critiques…',
      },
      {
        key: 'zones_sensibles',
        label: 'Zones à sensibilité écologique particulière',
        type: 'textarea',
        placeholder: 'Aires protégées, zones humides (Ramsar), forêts classées à proximité…',
      },
      // Milieu humain
      {
        key: 'population',
        label: 'Population et démographie',
        type: 'textarea',
        required: true,
        placeholder: "Nombre d'habitants, densité, taux de croissance, groupes vulnérables…",
      },
      {
        key: 'activites_economiques',
        label: 'Activités économiques principales',
        type: 'textarea',
        required: true,
        placeholder: 'Agriculture, élevage, commerce, artisanat, mines artisanales…',
      },
      {
        key: 'infrastructures_existantes',
        label: 'Infrastructures et services existants',
        type: 'textarea',
        placeholder: 'Routes, eau potable, électricité, santé, éducation…',
      },
      {
        key: 'patrimoine_culturel',
        label: 'Patrimoine culturel et sites sacrés',
        type: 'textarea',
        placeholder: 'Sites archéologiques, lieux de culte, cimetières, forêts sacrées…',
      },
      {
        key: 'qualite_air_bruit',
        label: "Qualité de l'air et niveau sonore de référence",
        type: 'textarea',
        placeholder: 'Mesures de référence (si disponibles), sources actuelles de pollution…',
      },
    ],
  },
  {
    sectionNumber: 5,
    title: 'Analyse des alternatives',
    description: 'Examen des différentes options envisagées et justification du scénario retenu',
    article: 'Art. 9.5 Décret 2017-040',
    fields: [
      {
        key: 'alternatives_identifiees',
        label: 'Alternatives identifiées (sans projet, variantes de tracé/conception)',
        type: 'textarea',
        required: true,
        placeholder:
          'Alternative 0 (sans projet) : …\nAlternative A (variante 1) : …\nAlternative B (variante 2) : …',
      },
      {
        key: 'criteres_comparaison',
        label: 'Critères de comparaison des alternatives',
        type: 'textarea',
        required: true,
        placeholder: 'Critères techniques, économiques, environnementaux et sociaux retenus…',
      },
      {
        key: 'tableau_comparatif',
        label: 'Synthèse comparative des alternatives',
        type: 'textarea',
        required: true,
        placeholder:
          'Pour chaque alternative : avantages / inconvénients / impacts environnementaux majeurs…',
      },
      {
        key: 'justification_choix',
        label: 'Justification du scénario retenu',
        type: 'textarea',
        required: true,
        placeholder:
          "Pourquoi l'alternative retenue est-elle préférable du point de vue environnemental et social ?",
      },
    ],
  },
  {
    sectionNumber: 6,
    title: 'Identification et évaluation des impacts',
    description: "Analyse systématique des impacts du projet sur l'environnement et la société",
    article: 'Art. 9.6 Décret 2017-040',
    fields: [
      {
        key: 'methode_evaluation',
        label: "Méthode d'évaluation des impacts utilisée",
        type: 'select',
        options: [
          'Matrice de Léopold',
          'Méthode de Battelle',
          'Check-list avec pondération',
          'Analyse multicritères',
          'Autre méthode',
        ],
        required: true,
      },
      {
        key: 'criteres_evaluation',
        label: "Critères d'évaluation (intensité, étendue, durée, réversibilité)",
        type: 'textarea',
        required: true,
        placeholder:
          "Définissez les critères et l'échelle de notation utilisés (ex. faible/moyen/fort)…",
      },
      {
        key: 'impacts_phase_preparation',
        label: 'Impacts en phase de préparation/installation',
        type: 'textarea',
        required: true,
        placeholder:
          'Sur le milieu physique (sol, eau, air) :\nSur le milieu biologique (végétation, faune) :\nSur le milieu humain (déplacement, emploi, bruit) :',
      },
      {
        key: 'impacts_phase_construction',
        label: 'Impacts en phase de construction',
        type: 'textarea',
        required: true,
        placeholder: 'Sur le milieu physique :\nSur le milieu biologique :\nSur le milieu humain :',
      },
      {
        key: 'impacts_phase_exploitation',
        label: "Impacts en phase d'exploitation",
        type: 'textarea',
        required: true,
        placeholder: 'Sur le milieu physique :\nSur le milieu biologique :\nSur le milieu humain :',
      },
      {
        key: 'impacts_phase_fermeture',
        label: 'Impacts en phase de fermeture/réhabilitation',
        type: 'textarea',
        placeholder: 'Si applicable — impacts du démantèlement et de la réhabilitation du site…',
      },
      {
        key: 'impacts_positifs',
        label: 'Impacts positifs attendus',
        type: 'textarea',
        required: true,
        placeholder: 'Emplois créés, infrastructures, revenus, amélioration des services…',
      },
      {
        key: 'impacts_cumules',
        label: "Impacts cumulés avec d'autres projets de la zone",
        type: 'textarea',
        placeholder: 'Identifier les projets voisins et évaluer les effets cumulatifs…',
      },
    ],
  },
  {
    sectionNumber: 7,
    title: 'Plan de Gestion Environnementale et Sociale (PGES)',
    description: "Ensemble des mesures d'atténuation, de surveillance et de suivi des impacts",
    article: 'Art. 9.7 Décret 2017-040',
    fields: [
      {
        key: 'structure_pges',
        label: 'Structure et organisation du PGES',
        type: 'textarea',
        required: true,
        placeholder:
          'Décrivez comment le PGES est organisé (tableaux de mesures joints dans la section PGES)…',
      },
      {
        key: 'responsabilites',
        label: 'Responsabilités institutionnelles pour la mise en œuvre',
        type: 'textarea',
        required: true,
        placeholder: "Maître d'ouvrage : …\nEntrepreneur : …\nBureau de contrôle : …\nANGE : …",
      },
      {
        key: 'budget_pges',
        label: 'Budget de mise en œuvre du PGES (FCFA)',
        type: 'number',
        required: true,
        placeholder: '0',
      },
      {
        key: 'plan_surveillance',
        label: 'Plan de surveillance environnementale',
        type: 'textarea',
        required: true,
        placeholder:
          "Indicateurs suivis, fréquence de mesure, seuils d'alerte, responsables, coûts…",
      },
      {
        key: 'plan_suivi',
        label: "Plan de suivi et d'évaluation",
        type: 'textarea',
        required: true,
        placeholder:
          "Périodicité des rapports de suivi, indicateurs d'impact, évaluations à mi-parcours…",
      },
      {
        key: 'renforcement_capacites',
        label: 'Plan de renforcement des capacités',
        type: 'textarea',
        placeholder:
          "Formations prévues pour le maître d'ouvrage, l'entrepreneur, les communautés…",
      },
      {
        key: 'mecanisme_plaintes',
        label: 'Mécanisme de gestion des plaintes',
        type: 'textarea',
        required: true,
        placeholder:
          'Description du mécanisme : canaux de réception, délais de traitement, responsables…',
      },
    ],
  },
  {
    sectionNumber: 8,
    title: 'Programme de consultation et participation du public',
    description: 'Documentation des consultations publiques et des parties prenantes impliquées',
    article: 'Art. 9.8 Décret 2017-040',
    fields: [
      {
        key: 'parties_prenantes',
        label: 'Identification des parties prenantes',
        type: 'textarea',
        required: true,
        placeholder:
          'Communautés affectées :\nAutorités locales :\nONG et société civile :\nAdministrations sectorielles :\nGroupes vulnérables :',
      },
      {
        key: 'methode_consultation',
        label: 'Méthode et approche de consultation',
        type: 'textarea',
        required: true,
        placeholder: 'Réunions publiques, focus groups, entretiens individuels, enquêtes ménages…',
      },
      {
        key: 'seances_tenues',
        label: 'Séances de consultation tenues',
        type: 'textarea',
        required: true,
        placeholder:
          'Date | Lieu | Nombre de participants (H/F) | Principaux sujets abordés\n------------------------------------------------------------\n',
      },
      {
        key: 'preoccupations_soulevees',
        label: 'Préoccupations et craintes exprimées',
        type: 'textarea',
        required: true,
        placeholder:
          'Résumez les principales préoccupations des communautés et des autres parties prenantes…',
      },
      {
        key: 'reponses_apportees',
        label: 'Réponses et engagements du promoteur',
        type: 'textarea',
        required: true,
        placeholder:
          "Comment ces préoccupations ont-elles été prises en compte dans l'EIES et le PGES ?",
      },
      {
        key: 'plan_communication',
        label: "Plan de communication et d'information continu",
        type: 'textarea',
        placeholder:
          "Comment le public sera-t-il informé pendant la mise en œuvre et l'exploitation ?",
      },
    ],
  },
  {
    sectionNumber: 9,
    title: 'Conclusion et recommandations',
    description: "Synthèse de l'acceptabilité environnementale et recommandations finales",
    article: 'Art. 9.9 Décret 2017-040',
    fields: [
      {
        key: 'acceptabilite',
        label: 'Acceptabilité environnementale et sociale du projet',
        type: 'select',
        options: [
          'Acceptable sous conditions',
          'Acceptable sans réserve majeure',
          "Non acceptable en l'état",
        ],
        required: true,
      },
      {
        key: 'conditions_acceptabilite',
        label: "Conditions d'acceptabilité (mesures non négociables)",
        type: 'textarea',
        required: true,
        placeholder: "Listez les mesures dont la mise en œuvre conditionne l'acceptabilité…",
      },
      {
        key: 'risques_residuels',
        label: "Risques résiduels après mesures d'atténuation",
        type: 'textarea',
        required: true,
        placeholder:
          'Quels impacts subsistent malgré les mesures prévues ? Comment seront-ils gérés ?',
      },
      {
        key: 'recommandations',
        label: 'Recommandations aux différentes parties prenantes',
        type: 'textarea',
        required: true,
        placeholder:
          "Au maître d'ouvrage :\nÀ l'ANGE :\nAux autorités locales :\nÀ l'entrepreneur :",
      },
      {
        key: 'suivi_post_projet',
        label: 'Suivi post-projet préconisé',
        type: 'textarea',
        placeholder:
          'Recommandations pour le suivi après la fin du projet (réhabilitation, post-fermeture)…',
      },
    ],
  },
];

export function getEIESSectionDef(sectionNumber: number): EIESSectionDef | undefined {
  return EIES_SECTIONS.find((s) => s.sectionNumber === sectionNumber);
}
