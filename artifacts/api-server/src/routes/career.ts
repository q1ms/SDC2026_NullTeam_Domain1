import { Router, type IRouter } from "express";
import {
  GenerateCareerInsightsBody,
  GenerateCareerInsightsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

router.post("/career-insights", async (req, res): Promise<void> => {
  const parsed = GenerateCareerInsightsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: "Add OPENROUTER_API_KEY to the app's Secrets to enable AI recommendations.",
    });
    return;
  }

  const { skills, scenario, roles } = parsed.data;
  if (skills.length > 40 || roles.length > 60) {
    res.status(400).json({ error: "Use up to 40 skills and 60 roles per request." });
    return;
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.APP_URL ?? "https://replit.com",
        "X-Title": "Future-Ready Workforce AI",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini",
        temperature: 0.35,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              'You are a practical career coach. Ground recommendations only in the supplied skills and role data. Do not invent salary or hiring claims. Return valid JSON only, shaped as {"summary":"...","recommendedRoles":[{"title":"exact role title from supplied data","rationale":"...","nextSkills":["..."]}]}. Recommend at most 3 roles and up to 4 next skills per role.',
          },
          {
            role: "user",
            content: JSON.stringify({ skills, scenario, roles }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      req.log.warn({ status: response.status }, "OpenRouter request failed");
      res.status(502).json({ error: "OpenRouter could not complete the recommendation." });
      return;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      res.status(502).json({ error: "OpenRouter returned an empty recommendation." });
      return;
    }

    const jsonText = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    let result: unknown;
    try {
      result = JSON.parse(jsonText);
    } catch {
      res.status(502).json({ error: "OpenRouter returned an unreadable recommendation." });
      return;
    }

    const validResult = GenerateCareerInsightsResponse.safeParse(result);
    if (!validResult.success) {
      res.status(502).json({ error: "OpenRouter returned an invalid recommendation format." });
      return;
    }

    res.json(validResult.data);
  } catch (error) {
    req.log.error({ error }, "Career insight request failed");
    res.status(502).json({ error: "Could not reach OpenRouter. Try again shortly." });
  }
});

export default router;
