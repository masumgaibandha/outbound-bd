import type { MetadataRoute } from "next";

import { SERVICES } from "@/components/public/services-data";
import { publicEnv } from "@/lib/public-env";

const STATIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "monthly", priority: 1 },
  { path: "/about", changeFrequency: "yearly", priority: 0.6 },
  { path: "/about/founder", changeFrequency: "yearly", priority: 0.6 },
  { path: "/services", changeFrequency: "monthly", priority: 0.8 },
  { path: "/how-it-works", changeFrequency: "yearly", priority: 0.6 },
  { path: "/results", changeFrequency: "monthly", priority: 0.7 },
  { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
  { path: "/testimonials", changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq", changeFrequency: "yearly", priority: 0.5 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.6 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms-of-service", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const serviceEntries: MetadataRoute.Sitemap = SERVICES.map((service) => ({
    url: `${baseUrl}/services/${service.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticEntries, ...serviceEntries];
}
