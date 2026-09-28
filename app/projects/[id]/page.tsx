import type { Metadata } from "next";
import { ProjectWorkspace } from "@/components/project-workspace";

export const metadata: Metadata = { title: "Project Workspace | PLACEMENT PREP BY HRU'S" };

export default async function ProjectWorkspaceRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProjectWorkspace projectId={id} />;
}
