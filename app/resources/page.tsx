import type { Metadata } from "next";
import { ResourcesPage } from "@/components/resources-page";
export const metadata: Metadata = { title: "Learning Resources" };
export default function ResourcesRoute() { return <ResourcesPage />; }
