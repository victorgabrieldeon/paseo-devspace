/** The workspace fields this plugin reads, declared locally so Git installs need no @getpaseo/client types. */
export type ProjectWorkspace = {
  readonly projectId: string;
  readonly projectDisplayName: string;
  readonly projectCustomName?: string | null | undefined;
  readonly projectRootPath: string;
};

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
