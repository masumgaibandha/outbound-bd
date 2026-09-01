import Image from "next/image";

import founderPortrait from "@/assets/founder/abdullah-al-masum-portrait.webp";
import { Container } from "@/components/public/container";
import { founderStats } from "@/components/public/founder-stats";
import { UpworkProofLink } from "@/components/public/upwork-proof-link";

export function FounderSection() {
  return (
    <section className="hero-wash relative border-b border-hairline py-16 sm:py-20">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="text-ink-muted text-xs font-semibold tracking-[0.18em] uppercase">
              Founder
            </p>

            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-2">
              <h1 className="font-heading text-ink type-section">
                Abdullah Al Masum
              </h1>
              <span className="border-hairline text-ink rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
                Upwork Top Rated
              </span>
            </div>
            <p className="text-ink-muted mt-2 text-sm font-medium">
              Founder, Outbound BD — based in Bangladesh, serving B2B clients
              globally
            </p>

            <p className="text-ink-muted mt-6 max-w-xl leading-relaxed text-pretty">
              Abdullah has spent over a decade in B2B lead generation and
              cold email outreach, working hands-on across prospect
              research, email infrastructure, deliverability, campaign
              strategy, copywriting, campaign management, and reply
              handling. Outbound BD runs those same disciplines as one
              connected program for every client, rather than handing
              pieces of it off to separate freelancers or tools.
            </p>

            <div className="border-hairline bg-surface mt-8 max-w-xl border p-6">
              <p className="text-ink-muted text-sm leading-relaxed">
                <span className="text-ink font-semibold">
                  A technical foundation, not just a marketing one.
                </span>{" "}
                A background in full-stack development supports the
                integrations, tracking, and scalable outbound systems behind
                every campaign — so infrastructure and reporting are built
                to hold up, not duct-taped together.
              </p>
            </div>

            <dl className="border-hairline mt-10 grid grid-cols-3 gap-x-6 gap-y-8 border-t pt-8">
              {founderStats.map((stat) => (
                <div key={stat.label}>
                  <dt className="font-heading text-ink text-3xl tracking-tight">
                    {stat.value}
                  </dt>
                  <dd className="text-ink-muted mt-1.5 text-sm leading-snug">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <UpworkProofLink />
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <div className="border-hairline bg-surface relative aspect-[4/5] overflow-hidden rounded-[2rem] border sm:aspect-square lg:aspect-[4/5]">
              <Image
                src={founderPortrait}
                alt="Abdullah Al Masum, founder of Outbound BD"
                unoptimized
                sizes="(min-width: 1024px) 40vw, (min-width: 640px) 60vw, 90vw"
                className="size-full object-cover object-[center_20%]"
              />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
