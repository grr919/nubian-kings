import { feedbackEmailText, sanitizeFeedback } from "@/game/feedback";

const RECIPIENT = "grr919@gmail.com";
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REPORTS = 5;
const attempts = new Map<string, number[]>();

function rateLimited(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const recent = (attempts.get(address) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  attempts.set(address, recent);
  return recent.length > MAX_REPORTS;
}

export async function POST(request: Request) {
  if (rateLimited(request)) return Response.json({ error: "Too many reports. Please try again later." }, { status: 429 });
  const raw = await request.text();
  if (raw.length > 20_000) return Response.json({ error: "The report is too large." }, { status: 413 });

  let input: Record<string, unknown>;
  try {
    input = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid report." }, { status: 400 });
  }
  if (input.website) return Response.json({ ok: true });

  let feedback;
  try {
    feedback = sanitizeFeedback(input);
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid report." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM_EMAIL;
  if (!apiKey || !from) return Response.json({ error: "Feedback delivery has not been configured yet." }, { status: 503 });

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({
        from,
        to: [RECIPIENT],
        subject: `[Nubian Kings] ${feedback.category} feedback`,
        text: `${feedbackEmailText(feedback)}\n\nApplication version: ${process.env.VERCEL_GIT_COMMIT_SHA ?? "local"}`,
      }),
    });
  } catch {
    return Response.json({ error: "The report could not be delivered. Please try again." }, { status: 502 });
  }
  if (!response.ok) return Response.json({ error: "The report could not be delivered. Please try again." }, { status: 502 });
  const result = await response.json() as { id?: string };
  return Response.json({ ok: true, reference: result.id?.slice(0, 8) });
}
