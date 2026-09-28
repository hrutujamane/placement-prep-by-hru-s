import type { Metadata } from "next";
import { ResumePage } from "@/components/resume-page";
export const metadata: Metadata = { title: "Resume & Portfolio" };
export default function ResumeRoute() { return <ResumePage />; }
