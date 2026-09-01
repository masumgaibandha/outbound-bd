import { SERVICES } from "@/components/public/services-data";

export const CONTACT_EMAIL = "hello@outboundbd.com";

// Outbound BD is consultation-led, not self-serve checkout: every pricing
// and service CTA routes here rather than to a purchase flow.
export const REQUEST_PROPOSAL_HREF = "/contact";

// The single confirmed public Calendly booking link. Every booking CTA
// site-wide reads STRATEGY_CALL_HREF below rather than this constant
// directly, so there is exactly one place to change it. If this is ever
// cleared, STRATEGY_CALL_HREF falls back to the contact form — never fill
// it with a placeholder, "#", or an example.com URL.
const CALENDLY_URL = "https://calendly.com/almasumbd/discovery-call";

export const STRATEGY_CALL_HREF = CALENDLY_URL || REQUEST_PROPOSAL_HREF;

// Visible label for every booking CTA — kept centralized alongside the
// href so wording and destination can never drift apart.
export const STRATEGY_CALL_LABEL = "Book a Discovery Call";

// Spread onto every booking CTA `<Link>`/`<a>`. Only opens in a new tab
// with rel="noopener noreferrer" when the href is actually external
// (i.e. the real Calendly URL is configured) — if CALENDLY_URL is ever
// cleared and STRATEGY_CALL_HREF falls back to the in-site /contact page,
// this correctly stops adding target="_blank".
export const STRATEGY_CALL_LINK_PROPS = CALENDLY_URL
  ? ({ target: "_blank", rel: "noopener noreferrer" } as const)
  : {};

export type NavLink = { href: string; label: string };

export type NavItem =
  | ({ type: "link" } & NavLink)
  | { type: "dropdown"; label: string; items: NavLink[] };

// Primary site navigation. Dropdown items render as accessible desktop
// popovers and a mobile accordion — see SiteHeader. Testimonials and the
// legal pages are deliberately footer-only (see FOOTER_EXPLORE_LINKS /
// FOOTER_LEGAL_LINKS below) rather than adding two more top-level items.
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
  { type: "link", href: "/results", label: "Results" },
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
  { href: "/results", label: "Results" },
  { href: "/pricing", label: "Pricing" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

// Legal-only row in the footer's bottom bar — kept separate from the
// Explore column, same convention as most B2B sites (and the MasumDev
// reference's own footer legal-links row).
export const FOOTER_LEGAL_LINKS: NavLink[] = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
];
