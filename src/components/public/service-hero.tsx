import Link from "next/link";

import { ButtonLink } from "@/components/public/button";
import { Container } from "@/components/public/container";
import {
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
} from "@/components/public/site-config";

type ServiceHeroProps = {
  title: string;
  intro: string;
};

export function ServiceHero({ title, intro }: ServiceHeroProps) {
  return (
    <section className="hero-wash relative border-b border-hairline">
      <Container className="max-w-4xl pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <nav aria-label="Breadcrumb" className="text-ink-muted text-sm">
          <Link href="/services" className="hover:text-ink transition-colors">
            Services
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink/70">{title}</span>
        </nav>

        <p className="text-ink-muted mt-6 text-xs font-semibold tracking-[0.18em] uppercase">
          Service
        </p>
        <h1 className="font-heading text-ink type-section mt-3 text-balance">
          {title}
        </h1>
        <p className="text-ink-muted mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
          {intro}
        </p>

        <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <ButtonLink
            href={STRATEGY_CALL_HREF}
            tone="action"
            size="lg"
            {...STRATEGY_CALL_LINK_PROPS}
          >
            {STRATEGY_CALL_LABEL}
          </ButtonLink>
          <ButtonLink href="/services" tone="outline" size="lg">
            See all services
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
