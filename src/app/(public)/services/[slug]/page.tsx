import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeliverablesSection } from "@/components/public/deliverables-section";
import { FinalCtaSection } from "@/components/public/final-cta-section";
import { FitSection } from "@/components/public/fit-section";
import { NumberedProcessSection } from "@/components/public/numbered-process-section";
import { ProblemsSection } from "@/components/public/problems-section";
import { RequirementsSection } from "@/components/public/requirements-section";
import { ServiceFaqSection } from "@/components/public/service-faq-section";
import { ServiceHero } from "@/components/public/service-hero";
import { getServiceBySlug, SERVICES } from "@/components/public/services-data";

type ServicePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    return {};
  }

  return {
    title: service.metaTitle,
    description: service.metaDescription,
  };
}

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);

  if (!service) {
    notFound();
  }

  return (
    <>
      <ServiceHero title={service.heroTitle} intro={service.heroIntro} />
      <ProblemsSection items={service.problems} />
      <FitSection goodFit={service.goodFit} notFit={service.notFit} />
      <DeliverablesSection items={service.deliverables} />
      <NumberedProcessSection items={service.process} />
      <RequirementsSection items={service.requirements} />
      <ServiceFaqSection items={service.faqs} />
      <FinalCtaSection
        heading={`Ready to talk about ${service.navLabel.toLowerCase()}?`}
        secondaryHref="/services"
        secondaryLabel="See all services"
      />
    </>
  );
}
