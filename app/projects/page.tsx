import type { Metadata } from "next";
import { ProjectsPage } from "@/components/projects-page";
export const metadata: Metadata = { title: "Project Builder" };
export default function ProjectsRoute() { return <ProjectsPage />; }
