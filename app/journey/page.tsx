import type { Metadata } from "next";
import { EngineeringJourneyPage } from "@/components/engineering-journey-page";

export const metadata: Metadata = { title: "My Engineering Journey | PLACEMENT PREP BY HRU'S" };

export default function JourneyRoute() {
  return <EngineeringJourneyPage />;
}
