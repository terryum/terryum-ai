// Dynamic imports for auth/private — avoids pulling cookies() into static render path
// import { getAuthenticatedGroup, isAdminSession } from '@/lib/group-auth';
// import { getPrivateProjects, getPrivateProject, getAllPrivateProjects } from '@/lib/private-content';
import type { ProjectMeta } from '@/types/project';
import projectsBundle from '../../projects/gallery/projects.json';

export async function loadPublicProjects(): Promise<ProjectMeta[]> {
  return (projectsBundle as unknown as { projects: ProjectMeta[] }).projects;
}

export async function getAllProjects(): Promise<ProjectMeta[]> {
  const publicProjects = await loadPublicProjects();
  const projects = [...publicProjects];

  // Merge private projects (dynamic import to avoid cookies() in static path)
  const { getAuthenticatedGroup, isAdminSession } = await import('@/lib/group-auth');
  const [group, admin] = await Promise.all([getAuthenticatedGroup(), isAdminSession()]);
  if (group || admin) {
    const { getAllPrivateProjects, getPrivateProjects } = await import('@/lib/private-content');
    const privateProjects = admin
      ? await getAllPrivateProjects()
      : group ? await getPrivateProjects(group) : [];
    const existingSlugs = new Set(projects.map(p => p.slug));
    for (const pp of privateProjects) {
      if (!existingSlugs.has(pp.slug)) projects.push(pp);
    }
  }

  return projects.sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getProject(slug: string): Promise<ProjectMeta | null> {
  const publicProjects = await loadPublicProjects();
  const project = publicProjects.find(p => p.slug === slug) ?? null;
  if (project) return project;

  // Fallback: try Supabase private projects (dynamic import)
  const { getAuthenticatedGroup, isAdminSession } = await import('@/lib/group-auth');
  const [group, admin] = await Promise.all([getAuthenticatedGroup(), isAdminSession()]);
  if (!group && !admin) return null;

  const { getPrivateProject } = await import('@/lib/private-content');
  const privateProject = await getPrivateProject(slug);
  if (!privateProject) return null;

  if (privateProject.visibility === 'group' && !admin) {
    if (!group || !(privateProject.allowed_groups?.includes(group))) return null;
  }

  return privateProject;
}
