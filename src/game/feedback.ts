export const FEEDBACK_CATEGORIES = ["Rules", "Gameplay bug", "Interface", "NPC behavior", "Balance", "Artwork", "Other"] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface FeedbackDiagnostics {
  level: "Beginner" | "Amateur" | "Master";
  seed: string;
  round: number;
  phase: string;
  humanFaction: string;
  npcCount: number;
  nileFloods: boolean;
  victoryMode?: string;
  recentHistory: string[];
}

export interface FeedbackSubmission {
  category: FeedbackCategory;
  description: string;
  expected?: string;
  contactEmail?: string;
  diagnostics?: FeedbackDiagnostics & { browser: string; viewport: string };
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function sanitizeFeedback(value: unknown): FeedbackSubmission {
  if (!value || typeof value !== "object") throw new Error("Invalid feedback");
  const input = value as Record<string, unknown>;
  const category = FEEDBACK_CATEGORIES.includes(input.category as FeedbackCategory) ? input.category as FeedbackCategory : undefined;
  const description = cleanText(input.description, 4000);
  const expected = cleanText(input.expected, 2000);
  const contactEmail = cleanText(input.contactEmail, 254);
  if (!category || description.length < 10) throw new Error("Choose a category and provide at least 10 characters.");
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw new Error("Enter a valid email address.");

  let diagnostics: FeedbackSubmission["diagnostics"];
  if (input.diagnostics && typeof input.diagnostics === "object") {
    const item = input.diagnostics as Record<string, unknown>;
    const level = ["Beginner", "Amateur", "Master"].includes(String(item.level)) ? item.level as FeedbackDiagnostics["level"] : undefined;
    if (level) diagnostics = {
      level,
      seed: cleanText(item.seed, 64),
      round: Math.max(0, Math.min(100000, Number(item.round) || 0)),
      phase: cleanText(item.phase, 40),
      humanFaction: cleanText(item.humanFaction, 80),
      npcCount: Math.max(0, Math.min(4, Number(item.npcCount) || 0)),
      nileFloods: item.nileFloods === true,
      victoryMode: cleanText(item.victoryMode, 40) || undefined,
      recentHistory: Array.isArray(item.recentHistory) ? item.recentHistory.slice(0, 10).map((line) => cleanText(line, 300)).filter(Boolean) : [],
      browser: cleanText(item.browser, 300),
      viewport: cleanText(item.viewport, 40),
    };
  }

  return { category, description, expected: expected || undefined, contactEmail: contactEmail || undefined, diagnostics };
}

export function feedbackEmailText(feedback: FeedbackSubmission) {
  const lines = [
    `Category: ${feedback.category}`,
    `Contact: ${feedback.contactEmail ?? "Anonymous"}`,
    "",
    "What happened:",
    feedback.description,
  ];
  if (feedback.expected) lines.push("", "What was expected:", feedback.expected);
  if (feedback.diagnostics) {
    const { recentHistory, ...details } = feedback.diagnostics;
    lines.push("", "Approved diagnostics:", ...Object.entries(details).map(([key, value]) => `${key}: ${value ?? ""}`));
    if (recentHistory.length) lines.push("", "Recent public game history:", ...recentHistory.map((line) => `- ${line}`));
  } else {
    lines.push("", "Diagnostics: Not included by tester");
  }
  return lines.join("\n");
}
