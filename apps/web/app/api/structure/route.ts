import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_VISIBILITY,
  SECTION_KEYS,
  type SectionKey,
  type Sections,
} from "@shared/profile";

export const maxDuration = 60;

const MAX_INPUT_CHARS = 50_000;

const SECTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [...SECTION_KEYS],
  properties: {
    identity: {
      type: "string",
      description:
        "Who this person is: name, role, location, how agents should refer to them. Markdown. Empty string if the text contains nothing relevant.",
    },
    scheduling: {
      type: "string",
      description:
        "Working hours, timezone, meeting and calendar preferences. Markdown. Empty string if nothing relevant.",
    },
    dietary: {
      type: "string",
      description:
        "Allergies, diets, food likes and dislikes. Markdown. Empty string if nothing relevant.",
    },
    sizes: {
      type: "string",
      description:
        "Clothing and shoe sizes, fit preferences. Markdown. Empty string if nothing relevant.",
    },
    budget: {
      type: "string",
      description:
        "Spending comfort zones, price ceilings, subscription appetite. Markdown. Empty string if nothing relevant.",
    },
    comms: {
      type: "string",
      description:
        "Communication style, tone, sign-offs, preferred channels, important contacts. Markdown. Empty string if nothing relevant.",
    },
    custom: {
      type: "string",
      description:
        "Anything useful to an agent that fits no other section. Markdown. Empty string if nothing relevant.",
    },
  },
} as const;

const SYSTEM_PROMPT = `You organize raw pasted text about a person (an old bio, a profile file, a chat-assistant export, scattered notes) into structured profile sections that AI agents will read before acting on that person's behalf.

Rules:
- Only use facts present in the text. Never invent, infer, or embellish.
- Write in compact markdown: short lines, "- " bullets for lists.
- Keep the person's own voice where present; otherwise use neutral subjectless statements ("Allergic to peanuts", "Prefers morning meetings"). Never write about them in third person.
- Strip anything that looks like a secret: passwords, API keys, card numbers.
- A section with no relevant facts must be an empty string.`;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let text: unknown;
  try {
    ({ text } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Paste something first." }, { status: 400 });
  }

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: SECTION_SCHEMA,
        },
      },
      messages: [
        {
          role: "user",
          content: text.slice(0, MAX_INPUT_CHARS),
        },
      ],
    });

    const block = response.content.find((b) => b.type === "text");
    const raw = JSON.parse(block?.type === "text" ? block.text : "{}") as Record<
      string,
      string
    >;

    const sections: Sections = {};
    for (const key of SECTION_KEYS) {
      const content = (raw[key] ?? "").trim();
      if (!content) continue;
      sections[key as SectionKey] = {
        content,
        visibility: DEFAULT_VISIBILITY[key as SectionKey],
      };
    }
    return NextResponse.json({ sections });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error("structure: Claude API error", error.status, error.message);
    } else {
      console.error("structure: unexpected error", error);
    }
    return NextResponse.json(
      { error: "Could not organize that. You can skip and start empty." },
      { status: 502 },
    );
  }
}
