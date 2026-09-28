import type { Metadata } from "next";
import { OnboardingPage } from "@/components/onboarding-page";
export const metadata: Metadata = { title: "Onboarding" };
export default function OnboardingRoute() { return <OnboardingPage />; }
