import type { PaseoWorkspace } from "@getpaseo/client";

export type ProjectWorkspace = Pick<
  PaseoWorkspace,
  "projectId" | "projectDisplayName" | "projectCustomName" | "projectRootPath"
>;

export type ProjectSummary = {
  readonly id: string;
  readonly name: string;
  readonly directory: string;
};

export function projectsFromWorkspaces(workspaces: readonly ProjectWorkspace[]): readonly ProjectSummary[] {
  const projects = new Map<string, ProjectSummary>();
  for (const workspace of workspaces) {
    if (projects.has(workspace.projectId)) continue;
    projects.set(workspace.projectId, {
      id: workspace.projectId,
      name: workspace.projectCustomName ?? workspace.projectDisplayName,
      directory: workspace.projectRootPath,
    });
  }
  return [...projects.values()].sort((left, right) => left.name.localeCompare(right.name));
}
