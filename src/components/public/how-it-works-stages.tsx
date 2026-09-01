import { Container } from "@/components/public/container";

const STAGES = [
  {
    title: "Discovery",
    description:
      "We start with a working session to understand your product, ICP, competitive position, and what a qualified conversation looks like for your team. This shapes everything that follows, from targeting criteria to messaging angle.",
  },
  {
    title: "Targeting",
    description:
      "We define firmographic and technographic targeting criteria, then research and verify a prospect list matched to it — no purchased or recycled data. Lists are checked for accuracy and refreshed as your ICP evolves.",
  },
  {
    title: "Infrastructure",
    description:
      "Dedicated sending domains and mailboxes are provisioned and isolated from your primary company email, with SPF, DKIM, and DMARC configured before anything sends. Mailboxes move through a staged warm-up period rather than jumping straight to full volume.",
  },
  {
    title: "Copy",
    description:
      "Multi-step sequences are written by senior strategists, grounded in your positioning, prior customers, and voice. You review and approve messaging before anything goes live — nothing sends without your sign-off.",
  },
  {
    title: "Campaign launch",
    description:
      "Sequences go live on the warmed, monitored infrastructure built in the previous stage. Every send is tracked against deliverability and reply signals from day one.",
  },
  {
    title: "Optimization",
    description:
      "We test subject lines, angles, and offers against real reply data, and reallocate volume toward what's converting. Adjustments happen on an ongoing basis, not just at a single review point.",
  },
  {
    title: "Reporting",
    description:
      "You get a plain-English weekly readout: what went out, what came back, and what's booked on your calendar — not a black-box dashboard of vanity metrics.",
  },
] as const;

export function HowItWorksStages() {
  return (
    <section className="border-hairline border-t py-20 md:py-28">
      <Container className="max-w-4xl">
        <ol className="divide-hairline border-hairline divide-y border-t border-b">
          {STAGES.map((stage, index) => (
            <li
              key={stage.title}
              className="grid gap-2 py-9 sm:grid-cols-[8rem_1fr] sm:gap-8"
              data-reveal
            >
              <span className="text-action font-heading text-sm tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-heading text-ink text-xl tracking-tight">
                  {stage.title}
                </h3>
                <p className="text-ink-muted mt-2 text-base leading-relaxed">
                  {stage.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
