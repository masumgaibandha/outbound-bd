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

// The founder's official public Upwork profile — the single source for the
// "View verified Upwork profile" link shown near founder stats. Centralized
// here so it's set in exactly one place; every consumer also spreads
// EXTERNAL_LINK_PROPS so the tab-safety attributes can't drift out of sync.
export const UPWORK_PROFILE_URL =
  "https://www.upwork.com/freelancers/~01a5eccfaf40a8a065?viewMode=1";

export const EXTERNAL_LINK_PROPS = {
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

export type NavLink = { href: string; label: string };

export type NavItem =
  | ({ type: "link" } & NavLink)
  | { type: "dropdown"; label: string; items: NavLink[] };

// Primary site navigation — deliberately short. "Home" is dropped since the
// logo already links there; "How It Works" and "FAQ" are dropped from the
// primary bar but stay fully reachable via the footer and in-page links
// (e.g. the process/FAQ teasers already link out from the homepage). About
// is a direct link, not a dropdown — /about/founder is reached from links
// on that page and the footer instead of crowding the header with a menu.
export const NAV_ITEMS: NavItem[] = [
  {
    type: "dropdown",
    label: "Services",
    items: SERVICES.map((service) => ({
      href: `/services/${service.slug}`,
      label: service.navLabel,
    })),
  },
  { type: "link", href: "/results", label: "Results" },
  { type: "link", href: "/pricing", label: "Pricing" },
  { type: "link", href: "/about", label: "About" },
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
