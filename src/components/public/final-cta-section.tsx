import { ButtonLink } from "@/components/public/button";
import { Container } from "@/components/public/container";
import {
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
} from "@/components/public/site-config";

type FinalCtaSectionProps = {
  heading?: string;
  description?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function FinalCtaSection({
  heading = "Ready for pipeline that doesn't depend on inbound?",
  description = "Tell us about your ICP and goals on a 30-minute call. We'll tell you honestly whether cold email is the right channel for you.",
  secondaryHref = "/contact",
  secondaryLabel = "Request a Proposal",
}: FinalCtaSectionProps) {
  return (
    <section className="bg-ink py-20 md:py-28">
      <Container className="max-w-3xl text-center">
        <h2 className="font-heading text-on-dark type-section text-balance">
          {heading}
        </h2>
        <p className="text-on-dark-muted mx-auto mt-5 max-w-xl text-lg text-pretty">
          {description}
        </p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink
            href={STRATEGY_CALL_HREF}
            tone="onDark"
            size="lg"
            {...STRATEGY_CALL_LINK_PROPS}
          >
            {STRATEGY_CALL_LABEL}
          </ButtonLink>
          <ButtonLink href={secondaryHref} tone="onDarkOutline" size="lg">
            {secondaryLabel}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
