import type { LucideIcon } from "lucide-react";
import {
  ShieldCheck,
  Radar,
  History,
  Sparkles,
  Activity,
  Target,
  BarChart3,
  Landmark,
  TrendingUp,
  Waypoints,
  GitPullRequestArrow,
  BellRing,
  RadarIcon,
  MessagesSquare,
  ClipboardList,
  Mail,
  FileClock,
  PieChart,
  FileText,
  ChartNoAxesGantt,
  Link2,
  HeartHandshake,
  ScrollText,
  KeyRound,
  FileCheck2,
  Cable,
  ServerCog,
  Plug,
  Wallet,
  FileSliders,
  Gauge,
  Coins,
  Compass,
  Layers,
  Workflow,
  Milestone,
  Fingerprint,
} from "lucide-react";

export type ProductFeature = { icon: LucideIcon; title: string; body: string };

export type Product = {
  slug: string;
  eyebrow: string;
  name: string;
  pitch: string;
  stat: { value: string; label: string };
  features: ProductFeature[];
};

// Framed as products, not a flat feature list — each one is a real reason
// a specific kind of buyer would connect a repo, not just a bucket for
// features that happened to share a theme. Shared between /features (the
// overview) and /platform/[slug] (one page per product) so the two can
// never drift apart.
export const PRODUCTS: Product[] = [
  {
    slug: "verification-engine",
    eyebrow: "Product 1 of 6",
    name: "The Verification Engine",
    pitch: "The core judgment layer every other product here is built on top of — turns raw commits into a defensible, evidence-backed account of what's actually done.",
    stat: { value: "0–100", label: "Confidence Score, always with its rationale" },
    features: [
      { icon: ShieldCheck, title: "Evidence Ledger", body: "Every commit and PR analyzed for tests added, TODOs, dead code, and call-graph context — a structured, inspectable evidence item, not a summary." },
      { icon: Target, title: "Confidence Score", body: "A 0–100 score per ticket, computed from its real Evidence Ledger, with the rationale always visible next to the number." },
      { icon: Activity, title: "Code Health Signals", body: "A transparent health score built from real signal — tests added weighed against missing tests, dead code, and open TODOs — feeding directly into the Confidence Score. Our honest answer to \"durable change\" scoring: we don't claim to track line-survival across history, because we don't have that data to back it." },
      { icon: History, title: "Historical Accuracy", body: "Per person, per month: how often claimed progress actually held up against verified evidence, tracked over time." },
      { icon: Fingerprint, title: "Code Provenance", body: "Every commit's added lines broken into Original Engineering, AI-Disclosed, and Duplicate/Boilerplate. AI-disclosed is real self-disclosure (the same Co-Authored-By signal as the AI Contribution Tracker), never a content-based guess at what AI wrote. Duplicate/boilerplate is real line-level copy-paste detection within your own repo's history, plus near-zero-signal lines (blank, lockfiles, vendored code). \"Original\" means exactly that — new to your repo's history and not AI-disclosed — not a claim of verified human authorship." },
    ],
  },
  {
    slug: "team-intelligence",
    eyebrow: "Product 2 of 6",
    name: "Team Intelligence",
    pitch: "The competitor-parity layer — the same DORA, efficiency, allocation, goal-tracking, and forecasting metrics Jellyfish/LinearB/Allstacks sell, computed here from the same real evidence instead of a second, separate data pipeline.",
    stat: { value: "4", label: "Standard DORA metrics, benchmarked against your own history" },
    features: [
      { icon: BarChart3, title: "DORA Metrics Panel", body: "Deployment frequency, lead time for changes, and the rest of the standard four DORA metrics, benchmarked against your own team's history." },
      { icon: Gauge, title: "Git Efficiency Metrics", body: "PR Size, Cycle Time broken into Coding/Pickup/Review/Deploy stages, Merge Frequency, Review Depth, PRs Merged Without Review, Rework Rate, and Refactor Rate — every one benchmarked into Elite/Good/Fair/Needs-Focus bands against real industry reference points, not an arbitrary scale." },
      { icon: Coins, title: "Investment Profile", body: "Commit volume classified into New Value, Feature Enhancements, Developer Experience, and Keeping-the-Lights-On — the same four-category split engineering leadership already reports up, computed from real keyword and volume signal instead of a quarterly self-report." },
      { icon: Compass, title: "Delivery Risk & Capacity Accuracy", body: "Every active sprint gets a real posture — On Track, Scope Creep, Overcommitted, or Capacity Mismatch — plus a planning-accuracy percentage, computed from which tickets were actually planned versus added mid-sprint." },
      { icon: Layers, title: "Team & Service Segmentation", body: "Scope any metric above — DORA, Efficiency, Investment Profile — by a named Team (a group of GitHub logins) or a named Service (a multi-repo grouping) instead of one person or one repo, without a second data pipeline." },
      { icon: Milestone, title: "Team Goals (OKR Cascade)", body: "Set a target on any real metric — DORA, Efficiency, Investment Profile — with live progress tracked automatically and an alert the moment a goal is at risk, cascading from an org-level goal down to each team's own." },
      { icon: Sparkles, title: "AI Contribution Tracker", body: "Detects self-disclosed AI assistance in commit messages (Co-Authored-By trailers, 'Generated with' lines) — real disclosure, not a behavioral guess." },
      { icon: Landmark, title: "Investment Allocation", body: "Commits and tickets tagged and rolled up by business initiative, so leadership can see where engineering time actually went." },
      { icon: FileCheck2, title: "Cost Capitalization Report", body: "Audit-ready R&D spend, classified by real title/description keywords and commit volume — dollar figures stay hidden until you configure a rate." },
      { icon: Wallet, title: "AI Tool Cost Tracking", body: "Log what you actually pay for Copilot, Cursor, Claude Code, and every other AI coding tool seat — normalized to a monthly figure and set next to the AI Contribution Tracker's real adoption signal, never a vendor comparison." },
      { icon: TrendingUp, title: "Delivery Forecast", body: "A statistical projection of a sprint's completion date from its own confidence-weighted velocity — a transparent trend line, not an opaque black-box model." },
      { icon: Waypoints, title: "Value Stream View", body: "Average time spent in each ticket status before moving to the next, computed only from real, tracked status transitions." },
    ],
  },
  {
    slug: "risk-automation",
    eyebrow: "Product 3 of 6",
    name: "Risk & Automation",
    pitch: "Catches the invisible failure modes no status meeting surfaces — quietly-grown scope, unlinked work, stalled reviews — before they show up as a missed deadline, and automates the PR busywork that's safe to automate.",
    stat: { value: "3", label: "Detectors watching every push: drift, orphan work, stalled PRs" },
    features: [
      { icon: GitPullRequestArrow, title: "Ticket Drift Detector", body: "Catches when a ticket's real scope has silently grown in the code, without a corresponding re-estimation or ticket update." },
      { icon: Link2, title: "Orphan Commit Detector", body: "Surfaces real work that was done but never linked to a ticket, and offers a one-click retroactive link so the effort gets credited." },
      { icon: RadarIcon, title: "Risk Radar", body: "A proactive alert feed extending the drift and orphan detectors into an early warning system for slipping deadlines." },
      { icon: BellRing, title: "Blocker Nudge Bot", body: "Slack alerts when a PR or review has stalled, so stuck work gets unstuck before it becomes a missed sprint." },
      { icon: Radar, title: "Anomaly Check-In Nudges", body: "Detects unusual drops in a person's commit activity and gently suggests a check-in — framed around wellbeing, never performance." },
      { icon: GitPullRequestArrow, title: "PR AutoRoute", body: "Suggests reviewers based on who actually has recent commit history in the same files — not a guess at expertise." },
      { icon: Workflow, title: "PR Workflow Automation", body: "Auto-labels every PR — missing-tests, needs-security-review, large-pr, safe-changes — the moment it opens, and can auto-approve only the narrowest case: small, non-functional changes (docs, config, tests) that touch nothing sensitive. Off by default, gated behind its own permission upgrade, and documented plainly: it adds one review, it never bypasses a repo's required-review count or branch protection." },
    ],
  },
  {
    slug: "reporting",
    eyebrow: "Product 4 of 6",
    name: "Communication & Reporting",
    pitch: "The same verification engine, translated for every audience that needs to hear it: developers who'd rather not retype their day, PMs who need a sprint rollup, investors who need one paragraph.",
    stat: { value: "7", label: "Report and digest types generated from one evidence source" },
    features: [
      { icon: MessagesSquare, title: "AI Repo Chat", body: "Ask your codebase questions in Slack or the dashboard, answered with citations back to the real evidence." },
      { icon: Plug, title: "MCP Server", body: "Connect Claude Desktop, Cursor, or any MCP-compatible client directly to your Evidence Ledger — query tickets, Confidence Scores, and Repo Chat from the AI tool you already work in, authenticated with a rotatable per-workspace token." },
      { icon: FileSliders, title: "Report Builder", body: "Pick exactly which real sections go into a report — shipped activity, cost capitalization, AI contribution, AI tool spend — deterministically assembled from the same evidence as every other report, no LLM rewrite step." },
      { icon: ClipboardList, title: "Auto-Drafted Standups", body: "A daily summary drafted from real commits for a developer to review and post — no typing from memory required." },
      { icon: Mail, title: "Slack & Email Digests", body: "A daily or weekly rollup delivered where the team already works, sourced from the same Evidence Ledger as everything else." },
      { icon: FileClock, title: "Visual Changelog", body: "Merged PRs and commits grouped by day into a real activity timeline — not a hand-curated release-notes page." },
      { icon: PieChart, title: "Investor Update Generator", body: "Auto-drafts the 'what we built' section of a monthly investor update, sourced from verified commit history, not memory." },
      { icon: FileText, title: "Onboarding Doc Generator", body: "Turns a codebase's real structure and recent history into living onboarding docs for new hires." },
      { icon: ChartNoAxesGantt, title: "Confidence-Weighted Burndown", body: "A sprint burndown built from real Confidence Score history, not self-reported percentages." },
    ],
  },
  {
    slug: "team-health",
    eyebrow: "Product 5 of 6",
    name: "Team Health",
    pitch: "The Swarmia-parity layer — developer experience signals correlated with real delivery data, and team norms that track themselves instead of living in a wiki nobody reads.",
    stat: { value: "100%", label: "Anonymous — no survey response is ever traceable to a person" },
    features: [
      { icon: HeartHandshake, title: "Pulse Surveys", body: "Short, genuinely anonymous developer-experience check-ins — no response is ever traceable back to a person, even in the audit log." },
      { icon: ScrollText, title: "Working Agreements", body: "Team-authored norms — PR size limits, review SLAs — written by the team, tracked automatically, never generated on their behalf." },
    ],
  },
  {
    slug: "enterprise",
    eyebrow: "Product 6 of 6",
    name: "Enterprise & Compliance",
    pitch: "What a security review or a regulated-industry customer actually asks for — SSO, an audit trail, and the option to keep every byte of code on infrastructure you control.",
    stat: { value: "0", label: "Bytes of your code used to train any third-party model" },
    features: [
      { icon: KeyRound, title: "SSO / SCIM", body: "Enterprise single sign-on plus SCIM user provisioning for identity providers like Okta and Azure AD." },
      { icon: FileCheck2, title: "Compliance & Audit Trail", body: "An exportable, timestamped record tying every privileged action to its actor — for regulated industries that need to prove process." },
      { icon: Cable, title: "Open Integration Framework", body: "A consistent connect/disconnect/status lifecycle for integrations beyond GitHub and Slack — Linear, Jira, PagerDuty, Datadog, Opsgenie." },
      { icon: ServerCog, title: "Private / On-Prem LLM", body: "Point analysis at a self-hosted, OpenAI-compatible model instead of a third-party API — the same pipeline, on infrastructure you control." },
    ],
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}
