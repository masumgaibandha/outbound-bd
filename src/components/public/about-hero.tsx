import { Container } from "@/components/public/container";

export function AboutHero() {
  return (
    <section className="hero-wash relative border-b border-hairline">
      <Container className="max-w-3xl py-16 text-center sm:py-20">
        <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
          About
        </p>
        <h1 className="font-heading text-ink type-section mt-4 text-balance">
          Founder-led outbound, run as one accountable system
        </h1>
        <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
          Outbound BD is a founder-led agency built to combine targeting,
          infrastructure, messaging, deliverability, campaign execution, and
          reporting under one accountable service — not split across separate
          vendors, freelancers, or tools.
        </p>
      </Container>
    </section>
  );
}
