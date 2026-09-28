import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to create a realistic, time-bound placement roadmap.",
};

export default function HomePage() {
  redirect("/login");
}
