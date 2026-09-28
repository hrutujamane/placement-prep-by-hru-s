import type { Metadata } from "next";
import { InterviewPage } from "@/components/interview-page";
export const metadata: Metadata = { title: "Interview Prep" };
export default function InterviewRoute() { return <InterviewPage />; }
