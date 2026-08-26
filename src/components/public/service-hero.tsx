import Link from "next/link";
import { buttonVariants } from "@heroui/styles";

import { STRATEGY_CALL_HREF } from "@/components/public/site-config";

type ServiceHeroProps = {
  title: string;
  intro: string;
};

export function ServiceHero({ title, intro }: ServiceHeroProps) {
  return (
    <section className="border-b border-hairline">
      <div className="mx-auto max-w-4xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <nav aria-label="Breadcrumb" className="text-sm text-subtext">
          <Link href="/services" className="transition-colors hover:text-ink">
            Services
          </Link>
          <span className="mx-2">/</span>
          <span className="text-ink/70">{title}</span>
        </nav>

        <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-royal uppercase">
          Service
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-ink sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-pretty text-subtext">
          {intro}
        </p>

        <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            href={STRATEGY_CALL_HREF}
            className={`${buttonVariants({ variant: "primary", size: "lg" })} w-full rounded-lg sm:w-auto`}
          >
            Book a Strategy Call
          </Link>
          <Link
            href="/services"
            className={`${buttonVariants({ variant: "outline", size: "lg" })} w-full rounded-lg sm:w-auto`}
          >
            See all services
          </Link>
        </div>
      </div>
    </section>
  );
}
