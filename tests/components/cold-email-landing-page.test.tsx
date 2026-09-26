// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ push: pushMock }) };
});

// Same stand-in as agencies-landing-page.test.tsx: static image imports
// resolve to bare strings under Vitest, which next/image rejects.
vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img"> & { src: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} />
  ),
}));

import ColdEmailLandingPage from "@/app/cold-email/page";
import ColdEmailThankYouPage from "@/app/cold-email/thank-you/page";
import { FINAL_CTA_ID, GET_DETAILS_ID, HERO_ID } from "@/components/agencies/agency-anchors";
import { AgencyLeadForm } from "@/components/agencies/agency-lead-form";
import {
  COLD_EMAIL_FAMILIAR,
  COLD_EMAIL_FEEDBACK_ITEM,
  COLD_EMAIL_PROOF_ITEMS,
  COLD_EMAIL_WHY_FAILS,
} from "@/components/cold-email/cold-email-copy";
import { COLD_EMAIL_PROOF_ID } from "@/components/cold-email/cold-email-proof-section";
import {
  LINKEDIN_PROFILE_URL,
  STRATEGY_CALL_HREF,
  UPWORK_PROFILE_URL,
} from "@/components/public/site-config";

const ROOT = path.resolve(__dirname, "../..");

type FbqMock = ReturnType<typeof vi.fn>;

beforeEach(() => {
  pushMock.mockReset();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      disconnect() {}
      unobserve() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
  Element.prototype.scrollIntoView = vi.fn();
  window.sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete (window as { fbq?: unknown }).fbq;
  delete (window as { Calendly?: unknown }).Calendly;
});

describe("/cold-email page copy and structure", () => {
  it("renders the hero copy, both hero buttons and the trust line", () => {
    render(<ColdEmailLandingPage />);
    const hero = document.getElementById(HERO_ID)!;
    const scope = within(hero);

    expect(scope.getByText("Cold email outreach, done for you")).toBeInTheDocument();
    expect(
      scope.getByRole("heading", { level: 1, name: "More sales conversations, without chasing leads yourself." }),
    ).toBeInTheDocument();
    const points = Array.from(hero.querySelectorAll("li")).map((node) => node.textContent);
    expect(points).toEqual([
      "Month-to-month, no long contract",
      "Your main domain is never used",
      "Verified lists, no risky addresses",
      "Live in about 3 weeks",
    ]);
    expect(scope.getByRole("link", { name: "Get the details" })).toHaveAttribute("href", `#${GET_DETAILS_ID}`);
    expect(scope.getByRole("link", { name: "Book a call" })).toHaveAttribute("href", STRATEGY_CALL_HREF);
    expect(scope.getByText(/^Top Rated on Upwork · .+ jobs · .+ hours · .+ years$/)).toBeInTheDocument();
  });

  it("fires a Contact pixel event from Book a call, never Lead", async () => {
    const fbq: FbqMock = vi.fn();
    (window as { fbq?: FbqMock }).fbq = fbq;
    render(<ColdEmailLandingPage />);

    await userEvent.click(within(document.getElementById(HERO_ID)!).getByRole("link", { name: "Book a call" }));
    expect(fbq).toHaveBeenCalledWith("track", "Contact");
    expect(fbq).not.toHaveBeenCalledWith("track", "Lead", expect.anything(), expect.anything());
  });

  it("renders the four Sound familiar? cards, each with a title and body, and the closing line", () => {
    render(<ColdEmailLandingPage />);
    const section = screen.getByRole("region", { name: "Sound familiar?" });
    const scope = within(section);
    expect(scope.queryByText("Who this works for")).not.toBeInTheDocument();

    const titles = scope.getAllByRole("heading", { level: 3 }).map((node) => node.textContent);
    expect(titles).toEqual([
      "Your pipeline runs on referrals",
      "You tried cold email and it went to spam",
      "You are doing outreach yourself",
      "Ads bring traffic, not conversations",
    ]);
    for (const card of COLD_EMAIL_FAMILIAR.cards) {
      expect(scope.getByText(card.body)).toBeInTheDocument();
    }
    expect(scope.getByText("If any of these sound like your month, this is the part I fix.")).toBeInTheDocument();
    // Problems, not benefits: no check icons in these cards.
    expect(section.querySelectorAll("li svg")).toHaveLength(0);
  });

  it("renders the four numbered Why most cold email fails blocks, subtext and closing line", () => {
    render(<ColdEmailLandingPage />);
    const scope = within(screen.getByRole("region", { name: "Why most cold email fails" }));
    expect(
      scope.getByText(
        "Four things decide whether your emails reach the inbox. Most campaigns get at least one of them wrong.",
      ),
    ).toBeInTheDocument();

    const blocks = scope.getAllByRole("listitem");
    expect(blocks.map((block) => within(block).getByRole("heading", { level: 3 }).textContent)).toEqual([
      "The technical setup",
      "The list",
      "The emails themselves",
      "Protecting the domain",
    ]);
    blocks.forEach((block, index) => {
      expect(block).toHaveTextContent(String(index + 1).padStart(2, "0"));
      expect(within(block).getByText(COLD_EMAIL_WHY_FAILS.blocks[index].body)).toBeInTheDocument();
    });
    expect(
      scope.getByText(
        "This is the work that happens before anyone reads your offer. It is also the part most people skip.",
      ),
    ).toBeInTheDocument();
  });

  it("renders how it works and the business-worded checklist", () => {
    render(<ColdEmailLandingPage />);
    expect(screen.getByText("We agree who to target.")).toBeInTheDocument();
    expect(screen.getByText("You get replies.")).toBeInTheDocument();
    expect(screen.getByText("Verified lead lists matched to your ideal customer")).toBeInTheDocument();
    expect(screen.queryByText("Verified lead lists matched to the client's ideal customer")).not.toBeInTheDocument();
  });

  it("has no pricing or margin section", () => {
    render(<ColdEmailLandingPage />);
    expect(screen.queryAllByTestId("agency-math-figure")).toHaveLength(0);
    expect(screen.queryByText(/\/month/)).not.toBeInTheDocument();
  });

  it("wraps the form in #get-details with its own heading, and ends with the final CTA", () => {
    render(<ColdEmailLandingPage />);
    const formSection = document.getElementById(GET_DETAILS_ID)!;
    expect(within(formSection).getByRole("heading", { name: "Tell me about your business" })).toBeInTheDocument();
    expect(within(formSection).getByText("Takes 30 seconds. I reply within one business day.")).toBeInTheDocument();
    expect(within(formSection).getByRole("button", { name: "Send my details" })).toBeInTheDocument();

    const finalCta = document.getElementById(FINAL_CTA_ID)!;
    expect(within(finalCta).getByRole("link", { name: "Get the details" })).toHaveAttribute(
      "href",
      `#${GET_DETAILS_ID}`,
    );
    expect(screen.getByTestId("agency-sticky-cta")).toBeInTheDocument();
  });

  it("shows the six FAQ questions in order", () => {
    render(<ColdEmailLandingPage />);
    const questions = Array.from(document.querySelectorAll("summary")).map((node) => node.textContent);
    expect(questions).toEqual([
      "Isn't this just email marketing?",
      "Will this hurt my main domain?",
      "How soon do campaigns start?",
      "Is there a contract?",
      "Do you guarantee meetings?",
      "How do I pay?",
    ]);
  });
});

describe("/cold-email proof section", () => {
  function proofSection() {
    return document.getElementById(COLD_EMAIL_PROOF_ID)!;
  }

  it("puts the sections in order: hero, sound familiar, proof, why it fails, form, how it works, FAQ", () => {
    render(<ColdEmailLandingPage />);
    const headings = Array.from(document.querySelectorAll("h1, h2")).map((node) => node.textContent);
    expect(headings).toEqual([
      "More sales conversations, without chasing leads yourself.",
      "Sound familiar?",
      "Real campaigns, real numbers",
      "Why most cold email fails",
      "Tell me about your business",
      "How it works",
      "Common questions",
    ]);
  });

  it("renders the four labelled screenshots plus the feedback image, each with its alt text", () => {
    render(<ColdEmailLandingPage />);
    const scope = within(proofSection());

    expect(scope.getByText("Every screenshot below is from a live client campaign.")).toBeInTheDocument();
    expect(scope.getAllByRole("img")).toHaveLength(5);
    for (const item of [...COLD_EMAIL_PROOF_ITEMS, COLD_EMAIL_FEEDBACK_ITEM]) {
      expect(scope.getByAltText(item.alt)).toBeInTheDocument();
      expect(scope.getByText(item.label)).toBeInTheDocument();
    }
    expect(COLD_EMAIL_PROOF_ITEMS.map((item) => item.label)).toEqual([
      "Campaign performance, Instantly",
      "Inbox placement test, Instantly",
      "Campaign at scale, Instantly",
      "Inbox warm-up report, Smartlead",
    ]);
    expect(
      scope.getByText(
        "These are specific client results, not a guaranteed or typical outcome for every campaign or market.",
      ),
    ).toBeInTheDocument();
    expect(scope.getByRole("heading", { name: "What clients say" })).toBeInTheDocument();
  });

  it("bolds the figures inside the captions", () => {
    render(<ColdEmailLandingPage />);
    const bold = Array.from(proofSection().querySelectorAll("figcaption strong")).map((node) => node.textContent);
    for (const figure of ["5.6K", "83.9%", "2.7%", "25", "3,907", "3,975", "127,149", "140", "42"]) {
      expect(bold).toContain(figure);
    }
  });

  it("links to the Upwork and LinkedIn profiles from site-config, in a new tab", () => {
    render(<ColdEmailLandingPage />);
    const scope = within(proofSection());
    const upwork = scope.getByRole("link", { name: "See the full Upwork profile" });
    const linkedin = scope.getByRole("link", { name: "Connect on LinkedIn" });

    expect(upwork).toHaveAttribute("href", UPWORK_PROFILE_URL);
    expect(linkedin).toHaveAttribute("href", LINKEDIN_PROFILE_URL);
    for (const link of [upwork, linkedin]) {
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }

    // Mirrors the hero's button pair: Upwork carries every class of the filled
    // "Get the details" button, LinkedIn every class of the outlined "Book a
    // call" button (tone, size, radius, hover). Width classes are skipped,
    // since only the profile buttons are full width.
    const hero = within(document.getElementById(HERO_ID)!);
    const classesOf = (element: HTMLElement) => element.className.split(/\s+/).filter(Boolean);
    const pairs = [
      { link: upwork, heroButton: hero.getByRole("link", { name: "Get the details" }), tone: ["bg-action", "hover:bg-action-hover"] },
      { link: linkedin, heroButton: hero.getByRole("link", { name: "Book a call" }), tone: ["border", "bg-transparent", "text-ink", "hover:border-action", "hover:text-action"] },
    ];
    for (const { link, heroButton, tone } of pairs) {
      const heroClasses = classesOf(heroButton);
      expect(heroClasses).toEqual(expect.arrayContaining([...tone, "rounded-full"]));
      const classes = classesOf(link);
      for (const cls of heroClasses.filter((c) => !c.startsWith("w-"))) {
        expect(classes, `${link.textContent} missing ${cls}`).toContain(cls);
      }
    }
    expect(classesOf(linkedin)).not.toContain("bg-action");

    // The URLs live only in site-config.ts, never hardcoded in the component.
    const source = readFileSync(path.join(ROOT, "src/components/cold-email/cold-email-proof-section.tsx"), "utf-8");
    expect(source).not.toMatch(/upwork\.com|linkedin\.com/);
  });

  it("opens a screenshot in the shared lightbox, steps to the next one, and closes it", async () => {
    render(<ColdEmailLandingPage />);
    const user = userEvent.setup();
    const [first, second] = COLD_EMAIL_PROOF_ITEMS;

    await user.click(screen.getByRole("button", { name: `Enlarge screenshot: ${first.alt}` }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(first.caption)).toBeInTheDocument();
    expect(within(dialog).getByText(first.label)).toBeInTheDocument();
    expect(within(dialog).getByText("1 of 4")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Next result" }));
    expect(within(dialog).getByText(second.caption)).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Close enlarged image" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the feedback image in its own single-item lightbox", async () => {
    render(<ColdEmailLandingPage />);
    await userEvent.click(
      screen.getByRole("button", { name: `Enlarge screenshot: ${COLD_EMAIL_FEEDBACK_ITEM.alt}` }),
    );
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("1 of 1")).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Next result" })).not.toBeInTheDocument();
  });
});

describe("/cold-email form labels", () => {
  it("uses Company website and Team size, with the four team size options", () => {
    render(<AgencyLeadForm variant="cold-email" />);

    expect(screen.getByLabelText("Company website")).toBeInTheDocument();
    expect(screen.queryByLabelText("Agency website")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Active clients")).not.toBeInTheDocument();

    const teamSize = screen.getByLabelText("Team size") as HTMLSelectElement;
    expect(teamSize.name).toBe("teamSize");
    const options = Array.from(teamSize.options).filter((option) => !option.disabled);
    expect(options.map((option) => option.textContent)).toEqual(["Just me", "2 to 10", "11 to 50", "50+"]);
  });

  it("offers the founder-worded need options", () => {
    render(<AgencyLeadForm variant="cold-email" />);
    const need = screen.getByLabelText("What do you need") as HTMLSelectElement;
    const options = Array.from(need.options).filter((option) => !option.disabled);
    expect(options.map((option) => option.textContent)).toEqual([
      "More sales calls for my business",
      "Take outreach off my plate",
      "Not sure yet",
    ]);
  });

  it("leaves the /agencies form's labels unchanged", () => {
    render(<AgencyLeadForm />);
    expect(screen.getByLabelText("Agency website")).toBeInTheDocument();
    expect(screen.getByLabelText("Active clients")).toBeInTheDocument();
    expect(screen.queryByLabelText("Team size")).not.toBeInTheDocument();
  });
});

async function fillValidForm() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Your name"), "Sam Founder");
  await user.type(screen.getByLabelText("Work email"), "sam@somecompany.com");
  await user.type(screen.getByLabelText("Company website"), "somecompany.com");
  await user.selectOptions(screen.getByLabelText("Team size"), "2-10");
  await user.selectOptions(screen.getByLabelText("What do you need"), "more-sales-calls");
  await user.selectOptions(screen.getByLabelText("Monthly budget"), "1k-plus");
  await user.click(screen.getByRole("checkbox"));
  return user;
}

describe("/cold-email form submission and the Lead event", () => {
  it("posts to /api/cold-email-lead, fires Lead exactly once, then goes to the thank-you page", async () => {
    const fbq: FbqMock = vi.fn();
    (window as { fbq?: FbqMock }).fbq = fbq;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgencyLeadForm variant="cold-email" />);
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Send my details" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/cold-email/thank-you"));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/cold-email-lead");
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.teamSize).toBe("2-10");
    expect(body).not.toHaveProperty("activeClients");

    const leadCalls = fbq.mock.calls.filter((call) => call[1] === "Lead");
    expect(leadCalls).toHaveLength(1);
    expect(leadCalls[0][3]).toEqual({ eventID: body.eventId });
  });

  it("never fires Lead when the server rejects the submission", async () => {
    const fbq: FbqMock = vi.fn();
    (window as { fbq?: FbqMock }).fbq = fbq;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: false, message: "Please fix the errors below." }), { status: 400 }),
      ),
    );

    render(<AgencyLeadForm variant="cold-email" />);
    const user = await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Send my details" }));

    expect(await screen.findByText("Please fix the errors below.")).toBeInTheDocument();
    expect(fbq).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("never fires Lead on a network error or a client-side validation failure", async () => {
    const fbq: FbqMock = vi.fn();
    (window as { fbq?: FbqMock }).fbq = fbq;
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<AgencyLeadForm variant="cold-email" />);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Send my details" }));
    expect(await screen.findByText("Select your team size")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await fillValidForm();
    await user.click(screen.getByRole("button", { name: "Send my details" }));
    expect(await screen.findByText(/Something went wrong sending your details/)).toBeInTheDocument();
    expect(fbq).not.toHaveBeenCalled();
  });
});

describe("/cold-email is statically generated", () => {
  it("the page and layout opt into nothing that forces dynamic rendering", () => {
    for (const file of ["src/app/cold-email/page.tsx", "src/app/cold-email/layout.tsx", "src/app/cold-email/thank-you/page.tsx"]) {
      const source = readFileSync(path.join(ROOT, file), "utf-8");
      expect(source, file).not.toMatch(/export const (dynamic|revalidate)/);
      expect(source, file).not.toMatch(/\b(headers|cookies|draftMode)\(/);
      expect(source, file).not.toMatch(/searchParams/);
      expect(source, file).not.toMatch(/^"use client"/m);
    }
  });

  it("renders TrackingGate from its own layout, like /agencies", () => {
    const layout = readFileSync(path.join(ROOT, "src/app/cold-email/layout.tsx"), "utf-8");
    expect(layout).toContain("<TrackingGate />");
    expect(layout).not.toContain("MasterclassAnnouncementBanner");
    expect(layout).not.toContain("SiteHeader");
  });
});

describe("/cold-email/thank-you", () => {
  it("shows its own subtext and sends utm_content cold-email-page to Calendly", () => {
    const initInlineWidget = vi.fn();
    (window as { Calendly?: unknown }).Calendly = { initInlineWidget };

    render(<ColdEmailThankYouPage />);

    expect(
      screen.getByText(
        "Pick a time below and I'll walk through your offer and whether cold email is the right fit.",
      ),
    ).toBeInTheDocument();
    const [options] = initInlineWidget.mock.calls[0] as [{ utm: Record<string, string> }];
    expect(options.utm.utmContent).toBe("cold-email-page");
    expect(options.utm.utmCampaign).toBe("cold-email");
  });
});
