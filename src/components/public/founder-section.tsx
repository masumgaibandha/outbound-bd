const STATS = [
  { value: "10+", label: "Years in B2B lead generation & cold email" },
  { value: "$150K+", label: "Earned on Upwork" },
  { value: "240+", label: "Completed Upwork projects" },
  { value: "22,000+", label: "Hours worked" },
] as const;

export function FounderSection() {
  return (
    <section className="relative overflow-hidden border-t border-hairline py-16 sm:py-20">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 -z-10 translate-x-[8%] -translate-y-[8%] text-[7rem] leading-none font-bold tracking-tighter text-navy/[0.04] select-none sm:text-[10rem] lg:text-[14rem]"
      >
        AM
      </span>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
          Founder
        </p>

        <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Abdullah Al Masum
          </h2>
          <span className="rounded-full border border-hairline px-2.5 py-1 text-xs font-semibold tracking-wide text-navy uppercase">
            Upwork Top Rated
          </span>
        </div>
        <p className="mt-2 text-sm font-medium text-subtext">
          Founder, Outbound BD — based in Bangladesh, serving B2B clients
          globally
        </p>

        <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-subtext">
          Abdullah has spent over a decade in B2B lead generation and cold
          email outreach, working hands-on across prospect research, email
          infrastructure, deliverability, campaign strategy, copywriting,
          campaign management, and reply handling. Outbound BD runs those
          same disciplines as one connected program for every client, rather
          than handing pieces of it off to separate freelancers or tools.
        </p>

        <div className="mt-8 max-w-2xl rounded-xl border border-hairline bg-canvas p-6">
          <p className="text-sm leading-relaxed text-subtext">
            <span className="font-semibold text-ink">
              A technical foundation, not just a marketing one.
            </span>{" "}
            A background in full-stack development supports the integrations,
            tracking, and scalable outbound systems behind every campaign —
            so infrastructure and reporting are built to hold up, not
            duct-taped together.
          </p>
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-hairline pt-10 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <dt className="text-3xl font-semibold tracking-tight text-ink">
                {stat.value}
              </dt>
              <dd className="mt-1.5 text-sm leading-snug text-subtext">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
