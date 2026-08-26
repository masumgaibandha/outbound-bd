const INDUSTRIES = [
  "SaaS & Technology",
  "Financial Services",
  "Professional Services",
  "Manufacturing & Industrial",
  "Healthcare & Life Sciences",
  "Logistics & Supply Chain",
] as const;

export function CredibilityStrip() {
  return (
    <section className="border-y border-hairline bg-canvas">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-xs font-semibold tracking-[0.14em] text-subtext uppercase">
          Built for outbound-led revenue teams in
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {INDUSTRIES.map((industry) => (
            <li
              key={industry}
              className="text-sm font-medium text-ink/70 sm:text-base"
            >
              {industry}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
