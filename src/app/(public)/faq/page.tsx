import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/public/container";
import { FaqCategorySection } from "@/components/public/faq-category-section";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { FAQ_CATEGORIES, getFaqsByCategory } from "@/components/public/faq-data";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers to common questions about Outbound BD's services, process, timelines, deliverability, data ownership, compliance, support, and results expectations.",
};

export default function FaqPage() {
  return (
    <>
      <section className="hero-wash relative border-b border-hairline">
        <Container className="max-w-3xl pt-16 pb-12 text-center sm:pt-20 sm:pb-16">
          <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
            FAQ
          </p>
          <h1 className="font-heading text-ink type-section mt-4 text-balance">
            Frequently asked questions
          </h1>
          <p className="text-ink-muted mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty">
            Everything we&apos;re most often asked, organized by topic.
            Can&apos;t find what you need?{" "}
            <Link
              href="/contact"
              className="text-ink decoration-action hover:text-action font-medium underline decoration-2 underline-offset-4 transition-colors"
            >
              Send us a project inquiry
            </Link>{" "}
            and ask directly.
          </p>

          <nav
            aria-label="FAQ categories"
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            {FAQ_CATEGORIES.map((category) => (
              <a
                key={category.id}
                href={`#${category.id}`}
                className="border-hairline text-ink/80 hover:border-action/40 hover:text-ink focus-visible:outline-action rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {category.label}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      {FAQ_CATEGORIES.map((category, index) => (
        <FaqCategorySection
          key={category.id}
          id={category.id}
          label={category.label}
          items={getFaqsByCategory(category.id)}
          tone={index % 2 === 0 ? "canvas" : "canvasAlt"}
        />
      ))}

      <FinalCtaSection
        heading="Still have questions?"
        description="Tell us about your project and we'll answer directly — no account or commitment required."
        secondaryHref="/contact"
        secondaryLabel="Request a Proposal"
      />
    </>
  );
}
