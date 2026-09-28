import type { Metadata } from "next";
import { JobsPage } from "@/components/jobs-page";
export const metadata: Metadata = { title: "Applications" };
export default function JobsRoute() { return <JobsPage />; }
