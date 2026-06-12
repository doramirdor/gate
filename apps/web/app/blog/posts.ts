export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  category: string;
  content: string;
}

export const POSTS: BlogPost[] = [
  {
    slug: "why-ai-agents-need-a-permission-layer",
    title: "Why AI agents need a permission layer",
    description:
      "Telling an AI to ask before acting is just a suggestion it can ignore. A real permission layer sits outside the model and enforces the check.",
    date: "2025-06-02",
    readTime: "5 min read",
    category: "Trust & Safety",
    content: `
AI assistants are getting better at acting on your behalf - booking flights, ordering groceries, drafting emails. But there is a gap between "can do" and "should do." Today, the only thing stopping an AI from spending your money or sending an email in your name is a line in the system prompt that says "ask first."

The problem: prompts are suggestions, not guardrails. A model can skip them, hallucinate past them, or simply misinterpret them. When the stakes are low - summarizing an article, generating a chart - that is fine. When the stakes involve your credit card, your inbox, or your calendar, you need something stronger.

## What a permission layer does

A permission layer sits between the AI and the action. It is not part of the model's context. It is infrastructure the model cannot bypass:

- **Before spending money**, the agent calls an approval endpoint and waits for a human yes or no.
- **Before sending a message**, same thing. The draft is held until you review it.
- **Before any irreversible action**, the agent is blocked. Not warned - blocked.

This is not a new idea. Unix has file permissions. Databases have row-level security. OAuth has scopes. The AI agent ecosystem just has not caught up yet.

## Why system prompts are not enough

Consider a simple scenario: you ask an assistant to order dinner. Your system prompt says "never spend more than $50 without asking." The assistant finds a restaurant, builds a cart totaling $47, and places the order. Great. But what if the delivery fee pushes it to $58? The model might not re-check the total. It might round in its favor. It might not even see the fee as part of the "spend."

A permission layer does not care about the model's interpretation. It sees "$58 > $50" and holds the order. The human sees a notification, reviews it, and taps approve or deny. That is it.

## The trust ladder

Not every action needs a manual review. A good permission layer supports a trust ladder:

1. **Manual approval** for new or high-stakes actions.
2. **Auto-approve rules** for categories you have vetted - "always allow grocery orders under $30."
3. **Budget thresholds** - spend up to a limit without asking, escalate above it.

Over time, you promote actions up the ladder as you build trust. But the ladder is yours to climb, not the model's.

## What this means in practice

If you are building an AI agent, the takeaway is: do not rely on your own prompt to enforce safety. Call an external service that holds the action until a human approves. Log every action for audit.

If you are a user handing tasks to an AI, look for agents that integrate a permission layer - not just ones that promise to ask first.

The difference between the two is the difference between a suggestion and a lock.
    `,
  },
  {
    slug: "what-is-model-context-protocol",
    title: "What is the Model Context Protocol (MCP)?",
    description:
      "MCP is an open standard that lets AI assistants connect to external tools and data sources. Here is what it means for you.",
    date: "2025-05-20",
    readTime: "4 min read",
    category: "Explainer",
    content: `
The Model Context Protocol (MCP) is an open standard, originally developed by Anthropic, that defines how AI assistants connect to external tools, data sources, and services. Think of it as a USB-C port for AI: one standard interface that works across different models and platforms.

## Why MCP matters

Before MCP, every AI integration was custom. If you wanted Claude to read your calendar, someone had to build a specific integration for Claude and Google Calendar. If you wanted ChatGPT to do the same thing, that was a separate integration. Every combination of model and service required its own connector.

MCP changes this. A service exposes an MCP endpoint once, and any MCP-compatible assistant can use it. The service defines what tools are available (read calendar, create event, send email), and the assistant calls them through a standard JSON-RPC interface.

## How it works

An MCP server exposes three things:

1. **Tools** - actions the assistant can take (e.g., "search emails," "book a meeting").
2. **Resources** - data the assistant can read (e.g., your profile, a document).
3. **Prompts** - pre-built templates the assistant can use.

The assistant discovers what is available, decides when to use a tool, and calls it. The server handles the actual execution - talking to the API, checking permissions, returning results.

## What this means for permissions

MCP makes it trivially easy for an assistant to act on your behalf. That is powerful, but it also means the permission question is more urgent than ever. If any MCP-compatible agent can call a tool that sends an email or charges your card, you need a way to control who can do what.

This is where a permission layer matters. Instead of trusting every agent that connects, you can require approval for sensitive actions, scope what context each agent sees, and log every interaction.

## The bigger picture

MCP is still early. The ecosystem is growing fast - new servers, new clients, new use cases every week. The agents that get adoption will be the ones that respect user control, because users will not hand over their email, calendar, and credit card to an agent they cannot rein in.

The standard makes integration easy. The hard part - and the important part - is building trust.
    `,
  },
  {
    slug: "giving-ai-personal-context-without-losing-control",
    title: "How to give AI assistants personal context without losing control",
    description:
      "Your AI works better when it knows your preferences. The trick is sharing just enough, to just the right agents, with a clear audit trail.",
    date: "2025-05-08",
    readTime: "6 min read",
    category: "Guide",
    content: `
Every time you use an AI assistant, you start from scratch. It does not know your dietary restrictions, your timezone, your budget, or how you like your emails worded. So you repeat yourself - every session, every tool, every agent.

The obvious fix is to give the AI a profile: a document with your preferences that it reads at the start of each session. But the obvious fix has an obvious problem: who else can read that document? What happens when you share your budget with a shopping agent and it leaks to a different service? How do you know what was read, by whom, and when?

## The three problems

1. **Repetition** - you re-explain your preferences constantly.
2. **Over-sharing** - when you do save context, every agent sees everything.
3. **No audit trail** - you have no idea what was accessed.

Solving one without the others is not useful. A shared profile without scoping is a privacy risk. Scoping without logging is unverifiable. Logging without a shared profile means you are still repeating yourself.

## A scoped profile

The idea is simple: save your preferences once, in sections, and control which sections each agent can see.

- **Public sections** - things any agent can read: your name, your timezone, your language.
- **Link-only sections** - shared with agents you explicitly connect: your dietary needs, your scheduling preferences.
- **Private sections** - only unlocked by specific token scopes: your budget, your communication style.

Each agent gets a token with defined scopes. A shopping agent might see your dietary and budget sections. A scheduling agent sees your calendar preferences and timezone. Neither sees the other's data.

## The audit trail

Every read is logged: which agent, which sections, when. Not as a feature - as a requirement. If you cannot answer "who read my budget this week?" then the system is not trustworthy.

The log also lets you spot patterns. If an agent is reading your profile 50 times a day, something is wrong. If an agent you do not recognize shows up, you revoke its token.

## Practical advice

If you are setting up context for your AI assistants today:

1. **Start with the minimum.** Share your timezone and name. Add sections as you need them.
2. **Use different scopes for different agents.** Your personal assistant does not need the same access as a code review bot.
3. **Review your log regularly.** It takes 30 seconds and tells you exactly what is happening.
4. **Set visibility defaults conservatively.** You can always open up access later; closing it after a leak is too late.

The goal is not to hide from your AI. It is to share deliberately, with a record of what was shared.
    `,
  },
  {
    slug: "the-trust-ladder",
    title: "The trust ladder: from manual approvals to auto-approve",
    description:
      "Start by approving everything. Promote trusted actions over time. Build a permission system that grows with your confidence.",
    date: "2025-04-25",
    readTime: "4 min read",
    category: "Product",
    content: `
When you first let an AI agent act on your behalf, every action feels risky. Should it really send that email? Is that purchase actually what you wanted? The natural response is to approve everything manually.

That works for a week. Then it becomes exhausting. You are approving the same grocery order every Tuesday, the same meeting confirmation every morning. The approval fatigue sets in, and you start rubber-stamping everything - which defeats the purpose.

## A better model: the trust ladder

Instead of all-or-nothing, think of permissions as a ladder:

### Rung 1: Manual approval

Every action requires your explicit yes. This is where you start with a new agent or a new category of action. You see the full request, review it, and approve or deny.

### Rung 2: Category auto-approve

After you have approved the same type of action several times - say, "grocery orders" - you can create a rule: "always allow grocery orders." The agent no longer asks for routine grocery runs. It still asks for everything else.

### Rung 3: Budget thresholds

For spending, you set a ceiling: "auto-approve purchases under $50." The agent handles small, routine purchases silently. Anything above the threshold still requires your approval.

### Rung 4: Full trust (with logging)

For agents you deeply trust and categories with low stakes, you might auto-approve broadly. But even at this level, every action is logged. You can review the trail anytime, and you can always step back down the ladder.

## How this works in practice

Say you connect a personal assistant agent:

- **Week 1**: It asks to book a haircut ($40). You approve. It asks to order lunch ($18). You approve. It asks to send a meeting invite. You approve.
- **Week 2**: You create an auto-approve rule for "dining under $30." Lunch orders go through silently. The haircut still asks (different category).
- **Week 3**: You add "scheduling" to auto-approve. Meeting invites go through silently. Purchases above $30 still ask.
- **Month 2**: You realize you have not denied a grocery order in 30 days. You raise the auto-approve threshold to $100 for groceries.

At every step, you are making a deliberate choice based on observed behavior. The agent earns trust; it does not assume it.

## The key insight

The ladder is not about convenience - it is about informed consent. Every promotion up the ladder is based on evidence: "I approved this 20 times and it was right every time." Every demotion is based on evidence too: "this agent sent a weird email, back to manual."

The worst permission systems are binary: either the agent can do everything or nothing. The best ones let you dial in exactly the level of autonomy you are comfortable with, for each agent, for each category, and change it anytime.
    `,
  },
  {
    slug: "self-hosting-gate",
    title: "Self-hosting Gate: run your own permission wall",
    description:
      "Gate is open source. If you want full control over your data and infrastructure, you can run the whole stack yourself.",
    date: "2025-04-10",
    readTime: "3 min read",
    category: "Developer",
    content: `
Gate is open source, and the entire stack can be self-hosted. If you need to keep your data on your own infrastructure - for compliance, for privacy, or because you want to - here is what that looks like.

## What you are deploying

Gate has two deployable pieces:

1. **The web app** - a Next.js application that handles onboarding, the profile editor, the approval inbox, and the settings page.
2. **The MCP edge function** - a Deno function that serves the actual MCP endpoint. This is what AI agents talk to.

Both share the same database (Postgres via Supabase) and the same auth layer.

## The quick path

The repo includes a Docker Compose setup that gets you running locally:

\`\`\`bash
git clone https://github.com/usegate/gate
cd gate/docker
docker compose up
\`\`\`

This starts the web app and a Postgres instance. For a full production setup, you will also need the Supabase self-host stack to handle auth and the edge function runtime.

## What you get

Self-hosting gives you:

- **Full data sovereignty.** Your profiles, tokens, approval logs, and rules never leave your infrastructure.
- **Custom auth.** Plug in your own identity provider instead of Supabase Auth.
- **Network isolation.** Run the MCP endpoint behind a VPN so only your internal agents can reach it.
- **Audit compliance.** Point auditors at your own database instead of a third-party service.

## What you give up

The hosted version at usegate.dev handles all of this for you. Self-hosting means you are responsible for:

- Database backups and migrations.
- TLS certificates and domain configuration.
- Keeping up with upstream updates.
- Running and scaling the edge function runtime.

For most individuals, the hosted version is the right call. Self-hosting makes sense for teams, companies with compliance requirements, or developers who want to extend the system.

## Extending Gate

Because the MCP handler is pure TypeScript with an injected database interface, you can swap in any persistence layer. The test suite runs entirely in-memory with no live database, so you can verify your changes without spinning up infrastructure.

The approval flow, token scoping, and audit logging are all in the handler layer - not in the database. If you want to add a new tool, a new approval rule shape, or a new notification channel, you are editing one file.

The codebase is intentionally small. The whole thing is readable in an afternoon.
    `,
  },
  {
    slug: "ai-agent-security-checklist",
    title: "A security checklist for AI agent deployments",
    description:
      "Before you let an AI agent act on your behalf, run through this checklist. Most of it is just good sense that has not caught up with the tooling yet.",
    date: "2025-03-28",
    readTime: "5 min read",
    category: "Trust & Safety",
    content: `
AI agents are moving from "answer questions" to "take actions." That shift changes the security model entirely. A chatbot that gives bad advice is annoying. An agent that sends the wrong email, books the wrong flight, or overspends your budget is a real problem.

Here is a checklist for anyone deploying or using AI agents that act on their behalf.

## Before connecting an agent

- [ ] **Verify the source.** Who built this agent? Is it open source? Can you read the system prompt? An agent you cannot inspect is an agent you cannot trust.
- [ ] **Check what permissions it requests.** Does a scheduling agent really need access to your email? Does a shopping agent need your calendar? Least-privilege is not a new concept.
- [ ] **Look for a permission layer.** Does the agent ask before acting, or does it just act? If it just acts, the system prompt is the only thing between you and an unwanted action.

## When setting up permissions

- [ ] **Start with manual approvals.** Do not auto-approve anything on day one. Watch what the agent does for a week.
- [ ] **Scope tokens narrowly.** If the agent only needs your dietary preferences and budget, do not give it access to your communication style and scheduling.
- [ ] **Set spending limits.** Even if you trust the agent, set a per-action and per-day ceiling. Mistakes happen.
- [ ] **Use separate tokens for separate agents.** If one agent is compromised, the blast radius is limited to its token.

## While the agent is running

- [ ] **Review the audit log.** At least weekly. Look for unexpected reads, unfamiliar agents, or unusual volumes.
- [ ] **Watch for scope creep.** An agent that started with "order groceries" and is now "managing your inbox" has escalated without your explicit permission.
- [ ] **Revoke unused tokens.** If you stopped using an agent three months ago, its token should not still be active.
- [ ] **Test the deny path.** Deny an approval and make sure the agent handles it gracefully. An agent that crashes or retries endlessly on denial is poorly built.

## For developers building agents

- [ ] **Never store user credentials.** Use token-based auth with scoped permissions. Tokens can be revoked; passwords cannot.
- [ ] **Implement idempotent actions.** If an approval is retried (network glitch, user double-tap), the action should not execute twice.
- [ ] **Log everything.** Every tool call, every approval request, every context read. Make the log available to the user, not just to your ops team.
- [ ] **Fail closed.** If the permission service is unreachable, deny the action. Do not default to allowing it.
- [ ] **Respect TTLs.** Approval requests should expire. An approval granted three hours ago for a $50 purchase should not be used to authorize a $500 purchase now.

## The meta-point

Most of this checklist is not AI-specific. It is standard security hygiene - least privilege, audit trails, fail-closed defaults - applied to a new surface. The tooling just has not caught up yet. Until it does, the checklist is your seatbelt.
    `,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
