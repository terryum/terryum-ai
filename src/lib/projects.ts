import fs from 'fs/promises';
import path from 'path';
import { getAuthenticatedGroup, isAdminSession } from '@/lib/group-auth';
import type { ProjectMeta } from '@/types/project';

const PROJECTS_PATH = path.join(process.cwd(), 'projects', 'gallery', 'projects.json');

async function loadProjects(): Promise<ProjectMeta[]> {
  const raw = await fs.readFile(PROJECTS_PATH, 'utf-8');
  return (JSON.parse(raw) as { projects: ProjectMeta[] }).projects;
}

function filterByVisibility(
  projects: ProjectMeta[],
  authenticatedGroup: string | null,
  isAdmin: boolean,
): ProjectMeta[] {
  if (isAdmin) return projects;
  return projects.filter((p) => {
    if (!p.visibility || p.visibility === 'public') return true;
    if (p.visibility === 'group' && authenticatedGroup) {
      return p.allowed_groups?.includes(authenticatedGroup) ?? false;
    }
    return false;
  });
}

export async function getAllProjects(): Promise<ProjectMeta[]> {
  const [projects, group, isAdmin] = await Promise.all([
    loadProjects(),
    getAuthenticatedGroup(),
    isAdminSession(),
  ]);
  return filterByVisibility(projects, group, isAdmin).sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getProject(slug: string): Promise<ProjectMeta | null> {
  const [projects, group, isAdmin] = await Promise.all([
    loadProjects(),
    getAuthenticatedGroup(),
    isAdminSession(),
  ]);
  const project = projects.find(p => p.slug === slug) ?? null;
  if (!project) return null;
  // Visibility check
  if (project.visibility === 'group') {
    if (!isAdmin && (!group || !(project.allowed_groups?.includes(group)))) {
      return null;
    }
  }
  return project;
}
