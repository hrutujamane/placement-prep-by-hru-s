const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
const vercelDeploymentUrl = process.env.VERCEL_URL?.trim();

export const brand = {
  name: "PLACEMENT PREP BY HRU'S",
  shortName: "PPH",
  tagline: "Learn. Build. Prove. Get Hired.",
  description:
    "Your AI career mentor for skills, projects, placements, interviews and engineering careers.",
  // Empty Vercel environment values must not be passed to new URL().
  // VERCEL_URL provides a safe deployment fallback until the final custom URL is configured.
  url: configuredAppUrl || (vercelDeploymentUrl ? `https://${vercelDeploymentUrl}` : "http://localhost:3000"),
} as const;

export const appMetadata = {
  title: `${brand.name} — From Zero to Job-Ready`,
  description: brand.description,
};
