import fs from 'fs/promises';
import path from 'path';
import type { ProjectMeta } from '@/types/project';

const PROJECTS_PATH = path.join(process.cwd(), 'projects', 'gallery', 'projects.json');

async function loadProjects(): Promise<ProjectMeta[]> {
  const raw = await fs.readFile(PROJECTS_PATH, 'utf-8');
  return (JSON.parse(raw) as { projects: ProjectMeta[] }).projects;
}

export async function getAllProjects(): Promise<ProjectMeta[]> {
  const projects = await loadProjects();
  return projects.sort((a, b) =>
    new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
}

export async function getProject(slug: string): Promise<ProjectMeta | null> {
  const projects = await loadProjects();
  return projects.find(p => p.slug === slug) ?? null;
}
