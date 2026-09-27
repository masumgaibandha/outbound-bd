// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import FaqPage from "@/app/(public)/faq/page";
import { FAQS } from "@/components/public/faq-data";

function answerOf(id: string) {
  const entry = FAQS.find((faq) => faq.id === id);
  if (!entry) throw new Error(`Unknown FAQ id: ${id}`);
  return entry;
}

function detailsFor(question: string) {
  const summary = screen.getByText(question);
  const details = summary.closest("details");
  if (!details) throw new Error(`No <details> for ${question}`);
  return details;
}

describe("FAQ: results-case-studies", () => {
  it("says published evidence exists and no longer points at a removed section", () => {
    const { answer } = answerOf("results-case-studies");
    expect(answer).toMatch(/^Yes\./);
    expect(answer).toContain("campaign performance, inbox placement tests, and verified client feedback");
    expect(answer).toContain("once an engagement is complete and the client has approved the figures");
    expect(answer).not.toMatch(/not yet published/i);
    expect(answer).not.toMatch(/homepage's Results section/i);
  });

  it("renders a link to /results after the answer on /faq", () => {
    render(<FaqPage />);
    const details = detailsFor("Do you have case studies or client results we can see?");
    expect(within(details).getByRole("link", { name: "See the results" })).toHaveAttribute("href", "/results");
  });

  it("renders no extra link for entries without one", () => {
    render(<FaqPage />);
    const details = detailsFor("Can you guarantee a specific number of meetings or replies?");
    expect(within(details).queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("FAQ: founder-led, timeline and deliverability wording", () => {
  it("says Masum runs every account personally", () => {
    const { answer } = answerOf("support-who-runs-account");
    expect(answer).toContain("Masum runs every account personally");
    expect(answer).not.toMatch(/an experienced outbound operator/i);
  });

  it("puts first sends around week 3, matching the rest of the site", () => {
    const { answer } = answerOf("timelines-results-speed");
    expect(answer).toContain("Most programs send their first emails around week 3 of kickoff");
    expect(answer).not.toMatch(/two to three weeks/i);
  });

  it("does not claim automated volume control", () => {
    const { answer } = answerOf("deliverability-protect-reputation");
    expect(answer).not.toMatch(/automatic/i);
    expect(answer).toContain("pull back volume by hand when deliverability signals dip");
  });

  it("uses no em or en dashes in any question, answer or link label", () => {
    for (const faq of FAQS) {
      for (const text of [faq.question, faq.answer, faq.link?.label ?? ""]) {
        expect(text).not.toMatch(/[–—]/);
      }
    }
  });
});
