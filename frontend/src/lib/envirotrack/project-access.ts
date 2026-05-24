import { prisma } from '@/lib/server/prisma';

/**
 * Vérifie qu'un utilisateur peut accéder à un projet, selon l'un des trois chemins :
 *  1. Membre de l'organisation propriétaire (bureau d'études)
 *  2. Expert indépendant propriétaire du projet
 *  3. Agent/Reviewer assigné explicitement via ProjectAssignment
 *
 * Retourne le projet (avec ses mesures PGES) si l'accès est accordé, null sinon.
 * Les appelants renvoient 404 — jamais 403 — pour ne pas révéler l'existence du projet.
 */
export async function assertProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      orgId: true,
      expertId: true,
      pgesMeasures: {
        select: { id: true, code: true, title: true, phase: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });
  if (!project) return null;

  // Chemin 1 : membre de l'organisation propriétaire
  if (project.orgId) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.orgId, userId } },
    });
    if (membership) return project;
  }

  // Chemin 2 : expert indépendant propriétaire
  if (project.expertId) {
    const expert = await prisma.expertProfile.findUnique({
      where: { id: project.expertId },
      select: { userId: true },
    });
    if (expert?.userId === userId) return project;
  }

  // Chemin 3 : agent/reviewer assigné directement au projet
  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (assignment) return project;

  return null;
}

/**
 * Vérifie que l'utilisateur est PROPRIÉTAIRE ou ADMIN du projet
 * (bureau OWNER/ADMIN, ou expert propriétaire).
 * Utilisé pour les opérations d'administration du projet (ex. : assigner des agents).
 */
export async function assertProjectOwnerOrAdmin(
  projectId: string,
  userId: string,
): Promise<boolean> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { orgId: true, expertId: true },
  });
  if (!project) return false;

  if (project.orgId) {
    const membership = await prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: project.orgId, userId } },
      select: { role: true },
    });
    return membership?.role === 'OWNER' || membership?.role === 'ADMIN';
  }

  if (project.expertId) {
    const expert = await prisma.expertProfile.findUnique({
      where: { id: project.expertId },
      select: { userId: true },
    });
    return expert?.userId === userId;
  }

  return false;
}
