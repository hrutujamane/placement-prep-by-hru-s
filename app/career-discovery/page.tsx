import type { Metadata } from "next";
import { CareerDiscoveryPage } from "@/components/career-discovery-page";
export const metadata: Metadata = { title: "Career Discovery" };
export default function CareerDiscoveryRoute() { return <CareerDiscoveryPage />; }
