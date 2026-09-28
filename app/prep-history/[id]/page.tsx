import type { Metadata } from "next";
import { PrepJourneyDashboard } from "@/components/prep-journey-dashboard";

export const metadata: Metadata = { title: "Preparation Journey" };

export default async function PrepJourneyRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PrepJourneyDashboard journeyId={id} />;
}
