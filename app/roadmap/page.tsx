import type { Metadata } from "next";
import { RoadmapPage } from "@/components/roadmap-page";
export const metadata: Metadata = { title: "Career Roadmap" };
export default function RoadmapRoute() { return <RoadmapPage />; }
