import { z } from "zod";

export const reportCategories = ["Bug", "Roadmap help", "Learning content", "Account", "Feature request", "Other"] as const;
export const reportStatuses = ["Open", "In review", "Resolved"] as const;

export const studentReportSchema = z.object({
  category: z.enum(reportCategories),
  message: z.string().trim().min(10, "Please describe the problem in at least 10 characters.").max(2_000),
  pagePath: z.string().trim().min(1).max(300).regex(/^\//, "The page reference must start with '/'."),
});

export const reportUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(reportStatuses),
  adminNote: z.string().trim().max(2_000).optional(),
});
