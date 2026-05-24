export * from './checklist-templates';
export * from './eies-sections';
// Re-export pges-templates but skip ProjectType (already exported from checklist-templates)
export type { PGESMeasureTemplate, Phase, Composante } from './pges-templates';
export {
  getPGESForProject,
  UNIVERSAL_PGES,
  ROUTE_PGES,
  MINE_PGES,
  ENERGIE_PGES,
  AGRICULTURE_PGES,
} from './pges-templates';
