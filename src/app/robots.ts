import type { MetadataRoute } from "next";

import { publicEnv } from "@/lib/public-env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = publicEnv.NEXT_PUBLIC_APP_URL;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/api/" }],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
