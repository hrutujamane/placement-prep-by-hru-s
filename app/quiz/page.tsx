import type { Metadata } from "next";
import { QuizPage } from "@/components/quiz-page";
export const metadata: Metadata = { title: "Assessments" };
export default function QuizRoute() { return <QuizPage />; }
