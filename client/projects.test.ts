import { describe, expect, test } from "bun:test";
import { projectsFromWorkspaces, type ProjectWorkspace } from "./projects";

describe("project grouping", () => {
  test("deduplicates workspaces and keeps project root", () => {
    const shared = {
      projectId: "project-1",
      projectDisplayName: "Repository",
      projectCustomName: "Product",
      projectRootPath: "/repo",
    };
    const workspaces: readonly ProjectWorkspace[] = [
      shared,
      shared,
      { projectId: "project-2", projectDisplayName: "API", projectRootPath: "/api" },
    ];

    expect(projectsFromWorkspaces(workspaces)).toEqual([
      { id: "project-2", name: "API", directory: "/api" },
      { id: "project-1", name: "Product", directory: "/repo" },
    ]);
  });
});
