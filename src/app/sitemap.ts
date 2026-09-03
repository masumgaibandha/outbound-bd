import type { MetadataRoute } from "next";

import { SERVICES } from "@/components/public/services-data";
import { isRegistrationEnabled } from "@/lib/masterclass/env";
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

  /*
   * The masterclass sales page is deliberately excluded from the sitemap
   * (and, correspondingly, from indexing via that page's own `robots`
   * metadata) until registration is actually open to the public. Reusing
   * `MASTERCLASS_REGISTRATION_ENABLED` here — rather than a second,
   * undocumented flag — means flipping the one env var that opens
   * registration is also what makes the page publicly discoverable; there
   * is no separate manual step to remember before a real launch.
   */
  const masterclassEntries: MetadataRoute.Sitemap = isRegistrationEnabled()
    ? [
        {
          url: `${baseUrl}/masterclass/lead-generation-cold-email`,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.8,
        },
      ]
    : [];

  return [...staticEntries, ...serviceEntries, ...masterclassEntries];
}
