import type { ProjectMeta } from '@/types/project';
import projectsBundle from '../../projects/gallery/projects.json';

/** Returns every project in the bundle regardless of visibility. */
export async function loadAllProjects(): Promise<ProjectMeta[]> {
  return (projectsBundle as unknown as { projects: ProjectMeta[] }).projects;
}

/** Returns only projects with visibility === 'public' (or undefined). */
export async function loadPublicProjects(): Promise<ProjectMeta[]> {
  const all = await loadAllProjects();
  return all.filter((p) => (p.visibility ?? 'public') === 'public');
}

/**
 * All projects (public + private). List pages render a 🔒 badge for non-public
 * items; detail pages gate access via requireReadAccess.
 */
export async function getAllProjects(): Promise<ProjectMeta[]> {
  const projects = [...(await loadAllProjects())];
  return projects.sort(
    (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getProject(slug: string): Promise<ProjectMeta | null> {
  return (await loadAllProjects()).find((p) => p.slug === slug) ?? null;
}
