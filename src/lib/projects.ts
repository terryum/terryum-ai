import fs from 'fs/promises';
import path from 'path';
import type { ProjectMeta } from '@/types/project';

const PROJECTS_PATH = path.join(process.cwd(), 'projects', 'gallery', 'projects.json');

export async function getAllProjects(): Promise<ProjectMeta[]> {
  const raw = await fs.readFile(PROJECTS_PATH, 'utf-8');
  const data = JSON.parse(raw) as { projects: ProjectMeta[] };
  return data.projects
    .sort((a, b) => {
      // newest first by date
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });
}
