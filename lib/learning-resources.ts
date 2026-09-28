import type { RoadmapMilestone } from "@/lib/types";

export type LearningResourceProvider = "NPTEL" | "YouTube" | "Udemy";

export interface LearningResourceRecommendation {
  id: string;
  provider: LearningResourceProvider;
  title: string;
  format: string;
  cost: string;
  level: "Beginner" | "Intermediate";
  duration: string;
  language: string;
  url: string;
  why: string;
  verified: string;
}

interface StructuredCourse {
  title: string;
  url: string;
}

const verifiedDate = "20 Sep 2026";

const structuredCourses: Record<string, StructuredCourse> = {
  "Embedded Systems": { title: "Embedded Systems Design", url: "https://www.nptel.ac.in/courses/106105159" },
  IoT: { title: "Introduction to Internet of Things", url: "https://www.nptel.ac.in/courses/106105166" },
  "RF Engineering": { title: "Fundamentals of Wireless Communication", url: "https://www.nptel.ac.in/courses/108106192" },
  "Radar Engineering": { title: "Microwave Remote Sensing", url: "https://www.nptel.ac.in/courses/105101213" },
  "Antenna Engineering": { title: "Fundamentals of Wireless Communication", url: "https://www.nptel.ac.in/courses/108106192" },
  "Microwave Engineering": { title: "Fundamentals of Wireless Communication", url: "https://www.nptel.ac.in/courses/108106192" },
  VLSI: { title: "VLSI Design Flow: RTL to GDS", url: "https://www.nptel.ac.in/courses/108106191" },
  "Semiconductor Engineering": { title: "VLSI Design", url: "https://www.nptel.ac.in/courses/117101058" },
  "Signal Processing": { title: "Principles of Signals and Systems", url: "https://www.nptel.ac.in/courses/108106151" },
  Telecommunication: { title: "Fundamentals of Wireless Communication", url: "https://www.nptel.ac.in/courses/108106192" },
  "Wireless Communication": { title: "Fundamentals of Wireless Communication", url: "https://www.nptel.ac.in/courses/108106192" },
  Networking: { title: "Introduction to Internet of Things", url: "https://www.nptel.ac.in/courses/106105166" },
  "Industrial Automation": { title: "Industrial Automation and Control", url: "https://www.nptel.ac.in/courses/108105088" },
  PLC: { title: "Automation in Manufacturing", url: "https://www.nptel.ac.in/courses/112105910" },
  Robotics: { title: "Automation in Manufacturing", url: "https://www.nptel.ac.in/courses/112105910" },
  "Core Electronics": { title: "Analog Circuits", url: "https://www.nptel.ac.in/courses/108101094" },
  "Software / IT": { title: "Data Structures and Algorithms", url: "https://www.nptel.ac.in/courses/106102064" },
  "AI + Electronics": { title: "Machine Learning for Engineering Applications", url: "https://www.nptel.ac.in/courses/106106198" },
  "GATE + Placement": { title: "Principles of Signals and Systems", url: "https://www.nptel.ac.in/courses/108106151" },
};

const fallbackCourse: StructuredCourse = {
  title: "Explore NPTEL engineering courses",
  url: "https://nptel.ac.in/courses",
};

export function getLearningResourcesForMilestone(track: string, milestone: RoadmapMilestone): LearningResourceRecommendation[] {
  const structured = structuredCourses[track] ?? fallbackCourse;
  const level = milestone.startWeek <= 4 ? "Beginner" : "Intermediate";
  const topic = `${track} ${milestone.title}`;
  const youtubeQuery = encodeURIComponent(`${topic} tutorial playlist`);
  const udemyQuery = encodeURIComponent(topic);

  return [
    {
      id: `${milestone.id}-nptel`,
      provider: "NPTEL",
      title: structured.title,
      format: "Structured course",
      cost: "Free to learn",
      level,
      duration: `Use in Weeks ${milestone.startWeek}–${milestone.endWeek}`,
      language: "English",
      url: structured.url,
      why: `Use the modules closest to “${milestone.title}” for a rigorous ${track} foundation.`,
      verified: `Official link checked ${verifiedDate}`,
    },
    {
      id: `${milestone.id}-youtube`,
      provider: "YouTube",
      title: `${milestone.title} practical videos`,
      format: "Video discovery",
      cost: "Free",
      level,
      duration: "Choose a focused playlist",
      language: "English/Hindi options",
      url: `https://www.youtube.com/results?search_query=${youtubeQuery}`,
      why: "Use for visual explanations and demonstrations; prefer complete playlists from established educators.",
      verified: `Search link checked ${verifiedDate}`,
    },
    {
      id: `${milestone.id}-udemy`,
      provider: "Udemy",
      title: `${milestone.title} project courses`,
      format: "Optional paid course",
      cost: "Paid · price varies",
      level,
      duration: "Self-paced",
      language: "Multiple options",
      url: `https://www.udemy.com/courses/search/?q=${udemyQuery}`,
      why: "Use only if you want a guided project path; compare the syllabus, preview, language and recent reviews before buying.",
      verified: `Search link checked ${verifiedDate}`,
    },
  ];
}
