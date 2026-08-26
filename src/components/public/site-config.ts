import { SERVICES } from "@/components/public/services-data";

export const CONTACT_EMAIL = "hello@outboundbd.com";

// Placeholder until a scheduling tool (e.g. Calendly, HubSpot Meetings) is
// wired up — routes prospects to a real inbox in the meantime.
export const STRATEGY_CALL_HREF = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Strategy call — Outbound BD",
)}`;

export type NavLink = { href: string; label: string };

export type NavItem =
  | ({ type: "link" } & NavLink)
  | { type: "dropdown"; label: string; items: NavLink[] };

// Primary site navigation. Dropdown items render as accessible desktop
// popovers and a mobile accordion — see SiteHeader.
export const NAV_ITEMS: NavItem[] = [
  { type: "link", href: "/", label: "Home" },
  {
    type: "dropdown",
    label: "About",
    items: [
      { href: "/about", label: "About Outbound BD" },
      { href: "/about/founder", label: "About the Founder" },
    ],
  },
  {
    type: "dropdown",
    label: "Services",
    items: SERVICES.map((service) => ({
      href: `/services/${service.slug}`,
      label: service.navLabel,
    })),
  },
  { type: "link", href: "/how-it-works", label: "How It Works" },
  { type: "link", href: "/pricing", label: "Pricing" },
  { type: "link", href: "/faq", label: "FAQ" },
  { type: "link", href: "/contact", label: "Contact" },
];

// Flattened destinations for the footer's "Explore" column, which can't
// render dropdowns. Services get their own dedicated footer column instead
// of being repeated here.
export const FOOTER_EXPLORE_LINKS: NavLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Outbound BD" },
  { href: "/about/founder", label: "About the Founder" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];
