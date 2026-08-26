import type { Metadata } from "next";
import Link from "next/link";

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
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-12 text-center sm:px-6 sm:pt-20 sm:pb-16">
          <p className="text-xs font-semibold tracking-[0.14em] text-royal uppercase">
            FAQ
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-subtext">
            Everything we&apos;re most often asked, organized by topic.
            Can&apos;t find what you need?{" "}
            <Link
              href="/contact"
              className="font-medium text-royal transition-colors hover:text-navy"
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
                className="rounded-full border border-hairline px-3.5 py-1.5 text-sm font-medium text-ink/80 transition-colors hover:border-royal/40 hover:text-ink"
              >
                {category.label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      {FAQ_CATEGORIES.map((category) => (
        <FaqCategorySection
          key={category.id}
          id={category.id}
          label={category.label}
          items={getFaqsByCategory(category.id)}
        />
      ))}

      <FinalCtaSection
        heading="Still have questions?"
        description="Tell us about your project and we'll answer directly — no account or commitment required."
        secondaryHref="/contact"
        secondaryLabel="Send a project inquiry"
      />
    </>
  );
}
