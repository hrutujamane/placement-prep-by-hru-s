import type { Metadata } from "next";
import { PrepHistoryPage } from "@/components/prep-history-page";

export const metadata: Metadata = { title: "Prep History" };

export default function PrepHistoryRoute() {
  return <PrepHistoryPage />;
}
