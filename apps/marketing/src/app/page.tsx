import { Section, Card, SecondaryButton } from "@/components/ui";
import { INSTALL_URL } from "@/lib/config";
import Link from "next/link";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { ShimmerButton } from "@/components/magicui/shimmer-button";
import Marquee from "@/components/magicui/marquee";
import { MagicCard } from "@/components/magicui/magic-card";

const PILLARS = [
  { title: "Evidence-first judgment", body: "Every score is traceable to cited evidence (tests, call graph, TODOs) — inspectable, not a black box." },
  { title: "Developer-first framing", body: "Saves developers time first with auto-drafted standups. Verification for PMs is a byproduct of a tool devs actually like." },
  { title: "Outward-facing", body: "The same engine powers client proof-of-work portals, investor updates, and new-hire onboarding docs." },
  { title: "Narrow, fast, self-serve", body: "No sales call, no multi-week rollout. Get value the same day you connect a repo." },
];

const PERSONAS = [
  { role: "Founders & Execs", need: "Know if progress is real before the next investor update.", feature: "Investor Update Generator" },
  { role: "Product Managers", need: "Verify standup claims without manually reading code diffs.", feature: "Claimed vs Shipped & Risk Radar" },
  { role: "Agency Owners", need: "Prove billed hours match real delivered work to clients.", feature: "Client Proof-of-Work Portal" },
  { role: "Developers", need: "Stop re-explaining work; get credit for real progress automatically.", feature: "Auto-Drafted Standups" },
];

const STEPS = [
  {
    title: "Connect a repo",
    body: "Install the read-only GitHub App. VeriSprint reads commits, diffs, and PR metadata to build evidence.",
    metric: "100%",
    metricLabel: "Transparent Analysis",
  },
  {
    title: "Every commit is evidence",
    body: "Each diff is analyzed for tests added, TODOs, and dead code — logged as an Evidence Item.",
    metric: "120+",
    metricLabel: "Code Points Checked",
  },
  {
    title: "Real Confidence Scores",
    body: "Tickets get a 0–100 score based on their Evidence Ledger. Score and rationale are always visible.",
    metric: "320k",
    metricLabel: "Commits Verified",
  },
];

const FEATURES = [
  { title: "Confidence Score", body: "A transparent 0–100 score per ticket, with the evidence always one click away." },
  { title: "Claimed vs. Shipped", body: "Flags mismatches as questions — 'ENG-123 is Done — should tests be added?'" },
  { title: "AI Repo Chat", body: "Ask your codebase questions, answered with citations back to real commits." },
  { title: "Confidence-Weighted Burndown", body: "A burndown built from real ConfidenceScore history." },
];

const COMPARISON_MATRIX = [
  { feature: "Evidence-first verification (Commit ↔ Ticket)", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "AI Repo Chat", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Client Proof-of-Work Portal", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Investment Allocation", vs: true, jelly: true, linear: false, gitclear: false, swarmia: false, allstacks: false },
  { feature: "DORA Metrics & Team Goals", vs: true, jelly: false, linear: true, gitclear: false, swarmia: false, allstacks: false },
  { feature: "Durable Change Score", vs: true, jelly: false, linear: false, gitclear: true, swarmia: false, allstacks: false },
  { feature: "Pulse Surveys & Working Agreements", vs: true, jelly: false, linear: false, gitclear: false, swarmia: true, allstacks: false },
  { feature: "ML-based Delivery Forecasting", vs: true, jelly: false, linear: false, gitclear: false, swarmia: false, allstacks: true },
];

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <Section variant="default" className="min-h-[85vh] flex flex-col justify-center pb-32 border-b border-slate-200 relative overflow-hidden">
        <DotPattern className="opacity-60" />
        <div className="mx-auto max-w-4xl text-center relative z-20 pt-10">
          <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl !leading-tight">
            Building the future with <br />
            <span className="text-brand">AI and strategy</span>
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-xl text-slate-600 leading-relaxed">
            What actually shipped — backed by commits. VeriSprint reads real GitHub activity, turns it into an Evidence Ledger and a per-ticket Confidence Score.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row relative z-20">
            <Link href={INSTALL_URL} className="w-full sm:w-auto">
              <ShimmerButton background="#001666" className="w-full text-lg shadow-[0_0_50px_rgba(0,22,102,0.3)]">
                Get Started <span className="ml-2">→</span>
              </ShimmerButton>
            </Link>
            <SecondaryButton href="/how-it-works" className="w-full sm:w-auto text-lg px-10 py-4">See how it works</SecondaryButton>
          </div>
        </div>

        {/* Terminal/IDE Mock UI Dashboard */}
        <div className="mx-auto mt-20 max-w-5xl relative z-10">
          <div className="rounded-xl border border-slate-200 bg-white shadow-[0_0_50px_rgba(0,22,102,0.3)] overflow-hidden flex flex-col font-mono">
            {/* Terminal header */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
               <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80 border border-red-900"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-900"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80 border border-green-900"></div>
               </div>
               <div className="text-xs text-slate-500 flex-1 text-center mr-8">verisprint-engine ~ /core</div>
            </div>
            <div className="flex flex-col md:flex-row min-h-[350px] bg-white">
              {/* Sidebar File Tree */}
              <div className="w-64 bg-slate-50/50 border-r border-slate-200 p-4 hidden md:block text-xs text-slate-600">
                <div className="uppercase tracking-wider text-slate-500 mb-4 font-semibold">Explorer</div>
                <div className="space-y-2">
                  <div className="text-slate-900 flex items-center gap-2"><span>📂</span> src</div>
                  <div className="pl-5 border-l border-slate-200 space-y-2 mt-2 ml-2">
                    <div className="text-[var(--accent-neon)] flex items-center gap-2"><span>📄</span> api_handler.go</div>
                    <div className="flex items-center gap-2"><span>📄</span> models.rs</div>
                    <div className="flex items-center gap-2"><span>📄</span> auth_test.go</div>
                  </div>
                </div>
              </div>
              {/* Main Log area */}
              <div className="flex-1 p-6 flex flex-col">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                  <div className="text-sm text-slate-700">Evaluating PR <span className="text-slate-900">#1042</span></div>
                  <div className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded uppercase tracking-wider">Confidence: 98%</div>
                </div>
                <div className="flex-1 space-y-3">
                  <div className="text-sm text-slate-500">
                    <span className="text-blue-400">info</span>  [analyzer] Extracted 4 evidence items from commit <span className="text-slate-700">c3f9a1b</span>
                  </div>
                  <div className="text-sm text-slate-500">
                    <span className="text-blue-400">info</span>  [analyzer] Verified test coverage for <span className="text-slate-700">api_handler.go</span>
                  </div>
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700 mt-4 leading-relaxed">
                     {`{\n  "status": "verified",\n  "durable_score": 98,\n  "linked_ticket": "ENG-409",\n  "evidence": ["added_tests", "resolved_todos"]\n}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Bento Grid / Stats Section */}
      <Section variant="default" className="pt-32">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Trusted by engineering teams <br/> to build <span className="text-brand">smarter</span>
          </h2>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3 mx-auto max-w-6xl">
          {STEPS.map((step, i) => (
            <Card key={step.title} className={i === 0 ? "bg-slate-50 md:row-span-2 flex flex-col justify-between border-slate-200" : "bg-white border-slate-200"}>
               <div>
                  <h3 className="text-5xl font-bold mb-2 text-slate-900">{step.metric}</h3>
                  <p className="text-xs font-bold uppercase tracking-wider font-monor text-brand mb-10">{step.metricLabel}</p>
               </div>
               <div>
                  <h4 className="text-xl font-bold text-slate-900">{step.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.body}</p>
               </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Features Section */}
      <Section variant="default">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Core Features</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Where human insight meets intelligent technology</h2>
        </div>
        
        <div className="grid gap-8 md:grid-cols-2 mx-auto max-w-6xl">
          {FEATURES.map((f) => (
            <MagicCard key={f.title} className="p-0 flex flex-col h-full bg-slate-50 border-none shadow-sm">
              <div className="p-8 pb-0">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-slate-600 leading-relaxed">{f.body}</p>
              </div>
              <div className="mt-8 flex-1 p-6 relative overflow-hidden flex items-end justify-center min-h-[250px]">
                 <div className="w-[110%] bg-white rounded-t-2xl shadow-xl border border-slate-200 relative translate-y-4 p-6 grid gap-4 transition-transform hover:-translate-y-2 z-20">
                    <div className="h-6 w-1/3 bg-slate-100 rounded-lg"></div>
                    <div className="h-4 w-2/3 bg-slate-100 rounded-lg"></div>
                    <div className="flex gap-3 mt-4">
                       <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-700">✓</div>
                       <div className="h-10 flex-1 rounded-lg bg-slate-50"></div>
                    </div>
                 </div>
              </div>
            </MagicCard>
          ))}
        </div>
      </Section>

      {/* Differentiation Pillars */}
      <Section variant="default" className="pt-32 bg-slate-50">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Why VeriSprint?</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Unlike legacy engineering intelligence tools, we verify the <span className="text-brand">truth</span>.
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            Legacy tools aggregate Git metrics into executive dashboards to track velocity. We actually read the diffs to tell you if the feature is functionally finished.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mx-auto max-w-5xl">
          {PILLARS.map((pillar) => (
            <MagicCard key={pillar.title} className="flex flex-col border-slate-200">
              <div className="flex flex-col h-full">
                <h4 className="text-xl font-bold text-slate-900 mb-2">{pillar.title}</h4>
                <p className="text-slate-600 leading-relaxed flex-1">{pillar.body}</p>
              </div>
            </MagicCard>
          ))}
        </div>
      </Section>

      {/* Comparison Matrix Section */}
      <Section variant="default" className="py-24 border-b border-slate-200 relative overflow-hidden bg-white">
        <div className="mx-auto max-w-4xl text-center mb-16 relative z-10">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Feature Parity</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Everything you need, <br/> none of the fragmentation.</h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            VeriSprint doesn&apos;t just verify your work. It provides full competitive feature parity with the legacy category, so you don&apos;t need to run five different tools.
          </p>
        </div>

        <div className="mx-auto max-w-6xl overflow-x-auto relative z-10">
          <table className="w-full text-left border-collapse border border-slate-200 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(0,22,102,0.1)]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="py-4 px-6 font-mono text-sm text-slate-700 w-1/3">Feature</th>
                <th className="py-4 px-6 font-mono text-sm text-[var(--accent-neon)] border-x border-[var(--accent-neon)]/30 bg-[var(--accent-neon)]/5 text-center">VeriSprint</th>
                <th className="py-4 px-4 font-mono text-xs text-slate-500 text-center">Jellyfish</th>
                <th className="py-4 px-4 font-mono text-xs text-slate-500 text-center">LinearB</th>
                <th className="py-4 px-4 font-mono text-xs text-slate-500 text-center">GitClear</th>
                <th className="py-4 px-4 font-mono text-xs text-slate-500 text-center">Swarmia</th>
                <th className="py-4 px-4 font-mono text-xs text-slate-500 text-center">Allstacks</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {COMPARISON_MATRIX.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-sm text-slate-700">{row.feature}</td>
                  <td className="py-4 px-6 text-center border-x border-[var(--accent-neon)]/30 bg-[var(--accent-neon)]/5 text-slate-900">
                    {row.vs ? "✓" : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-400">{row.jelly ? "✓" : "-"}</td>
                  <td className="py-4 px-4 text-center text-slate-400">{row.linear ? "✓" : "-"}</td>
                  <td className="py-4 px-4 text-center text-slate-400">{row.gitclear ? "✓" : "-"}</td>
                  <td className="py-4 px-4 text-center text-slate-400">{row.swarmia ? "✓" : "-"}</td>
                  <td className="py-4 px-4 text-center text-slate-400">{row.allstacks ? "✓" : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Personas Section */}
      <Section variant="default">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Built for your role</h2>
          <p className="mt-4 text-lg text-slate-600">Verification that serves the whole team, not just the VP of Engineering.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-4 mx-auto max-w-7xl">
          {PERSONAS.map(p => (
            <Card key={p.role} className="shadow-sm border-t-4 border-t-brand bg-white flex flex-col h-full">
              <h3 className="text-lg font-bold text-slate-900 mb-3">{p.role}</h3>
              <p className="text-sm text-slate-600 mb-6 flex-1">{p.need}</p>
              <div className="pt-4 border-t border-slate-200 mt-auto">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Key Feature</p>
                <p className="text-sm font-bold text-brand">{p.feature}</p>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* Testimonials */}
      <Section variant="default" className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-wider font-mono text-brand mb-3">Testimonials</p>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Trusted by leaders</h2>
        </div>
        <div className="relative flex w-full max-w-6xl mx-auto flex-col items-center justify-center overflow-hidden">
          <Marquee pauseOnHover className="[--duration:20s]">
            {[
              { name: "Sarah Jenkins", role: "VP of Engineering", quote: "VeriSprint completely changed how we run our sprint reviews. Instead of guessing, we just look at the evidence." },
              { name: "Mark Twan", role: "CTO", quote: "Finally, a tool that connects what the business wants with what engineering actually does, without adding overhead." },
              { name: "Elena Rostova", role: "Product Lead", quote: "The Confidence Score is a game changer. We don't argue about what's done anymore, we just check the score." },
              { name: "David Chen", role: "Founder", quote: "We show our investors the VeriSprint dashboard. Real commits, real proof. No more status theater." },
            ].map((t, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm w-96 mx-4">
                <div className="mb-6 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold text-lg">{t.name.charAt(0)}</div>
                <p className="text-slate-700 italic mb-8 leading-relaxed">&quot;{t.quote}&quot;</p>
                <div>
                  <p className="font-bold text-slate-900">{t.name}</p>
                  <p className="text-sm text-slate-500 mt-1">{t.role}</p>
                </div>
              </div>
            ))}
          </Marquee>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-slate-50"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-slate-50"></div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section variant="default" className="py-32 bg-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-4xl font-extrabold text-slate-900 sm:text-6xl mb-8 leading-tight">We combine human insight <br /> with artificial intelligence</h2>
          <p className="text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
            Ready to see what your team actually shipped? Start your free trial today and say goodbye to status update theater.
          </p>
          <Link href={INSTALL_URL} className="inline-block">
            <ShimmerButton background="#001666" className="text-lg px-8 py-2">Start for free</ShimmerButton>
          </Link>
        </div>
      </Section>
    </>
  );
}
