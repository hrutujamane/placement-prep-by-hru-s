import type { Metadata } from "next";
import { AdminPage } from "@/components/admin-page";

export const metadata: Metadata = { title: "Admin" };

export default function AdminRoute() {
  return <AdminPage />;
}
