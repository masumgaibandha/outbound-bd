import { buttonClass } from "@/components/public/button";
import { Container } from "@/components/public/container";
import { founderStats } from "@/components/public/founder-stats";

function statValue(label: string): string {
  return founderStats.find((stat) => stat.label === label)?.value ?? "";
}

/**
 * Copy is fixed, exact wording from the round's own instructions — do not
 * reword it here. Numbers in the trust line come from founder-stats.ts,
 * never restated as a literal here (see that file's own "single source of
 * truth" doc comment).
 */
export function AgencyHeroSection() {
  const jobs = statValue("Upwork jobs");
  const hours = statValue("Upwork hours");

  return (
    <section className="relative">
      <div
        aria-hidden="true"
        className="hero-wash pointer-events-none absolute inset-0 -z-10"
      />

      <Container className="pt-14 pb-16 text-center md:pt-16 md:pb-20 lg:pt-20 lg:pb-24">
        <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
          White-label cold email for agencies
        </p>

        <h1 className="type-display text-ink mx-auto mt-5 max-w-3xl text-balance">
          Add cold email to your agency without hiring for it.
        </h1>

        <p className="text-ink-muted mx-auto mt-6 max-w-2xl text-base leading-relaxed lg:text-[1.0625rem]">
          Your clients keep asking for more leads. I set up and run their
          cold email outreach under your brand: domains, inboxes, lead
          lists, copy and campaigns. You keep the client relationship and
          the margin.
        </p>

        <div className="mt-9 flex justify-center">
          <a href="#lead-form" className={buttonClass({ tone: "action", size: "lg" })}>
            See if it&apos;s a fit
          </a>
        </div>

        <p className="text-ink-muted mt-8 text-sm">
          Top Rated on Upwork · {jobs} jobs · {hours} hours · 10+ years in
          cold email
        </p>
      </Container>
    </section>
  );
}
