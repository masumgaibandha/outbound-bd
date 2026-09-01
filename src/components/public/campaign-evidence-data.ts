import type { StaticImageData } from "next/image";

import campaignResultSmartlead from "@/assets/results/campaign-result-smartlead.png";
import inboxPlacementTestResult2 from "@/assets/results/inbox-placement-test-result2.png";
import instantlyCampaignResult2 from "@/assets/results/instantly-campaign-result-2.png";
import instantlyResult98 from "@/assets/results/instantly-result_98.png";
import instantly20250805 from "@/assets/results/instantly_2025-08-05.png";

/**
 * Real screenshots from the founder's own independent client work — every
 * image here was inspected at full resolution before selection, and every
 * one showing a client-identifying name, email, or project name (several
 * shared the project name "HS_Athletics_Gatorade Hydration_Feb_26" in a
 * title bar, and one had a client name/email crudely redacted in red) was
 * cropped to remove that identifying strip before being added here — the
 * underlying metrics are untouched, only the identifying chrome above them
 * was cut. Nothing below the crop line contains client-identifying data.
 * campaign-result-smartlead.png also had a stray OS taskbar baked into the
 * bottom of the original capture (the browser window was shorter than the
 * page); that strip was cropped too — it wasn't client data, just visual
 * noise, and its removal clipped nothing metric-bearing.
 *
 * Every metric label/value/caption below was verified against the source
 * platform's own on-screen field label at native resolution (not inferred
 * from filename, number size, or position) — see the 2026-09-02 evidence
 * audit. One figure was specifically re-verified after a labeling-error
 * report: instantly-campaign-result-2.png's 78.65% is Instantly's own
 * "Positive Reply Rate" card (visible in the screenshot, not an open rate;
 * no open-rate metric is even shown on that particular report view) — the
 * number itself was correct, only the wording was tightened afterward to
 * make the denominator ("among replies", not sequence starts) unambiguous.
 *
 * A second, genuine error surfaced during that same audit and is fixed
 * here: inbox-placement-test-result2.png's 98.29% is 3,907 ÷ 3,975
 * *received* — not ÷ 3,980 *sent*, which was the original (wrong)
 * denominator in the caption even though the percentage itself was right.
 *
 * Every "open rate" caption is explicitly labeled platform-reported and
 * never framed as proof of inbox placement — that's a separate, dedicated
 * test (see the inbox-placement category). Dollar figures shown next to
 * "Opportunities" on the source screenshots (e.g. "$25,000") are Instantly's
 * own pipeline-value estimate, not independently verified revenue, so they
 * are intentionally omitted from every caption/alt text below even though
 * they're still visible in the screenshots themselves.
 *
 * Rejected outright (not used anywhere):
 * - campaign-send-reply-volume.png: low-quality/illegible, superseded by
 *   instantly_2025-08-05.png.
 * - The original inbox-placement-test.png (100% / single project) was
 *   dropped as a near-duplicate of inbox-placement-test-result2.png (the
 *   same underlying deliverability test, a later 98.29% run with visible
 *   per-provider variance) — showing both would repeat one story twice.
 *   That file was still cropped to remove its identifying title, in case
 *   it's ever revisited, even though it isn't imported here.
 */
export type EvidenceCategory = "campaign-performance" | "inbox-placement" | "infrastructure";

export type CampaignEvidenceItem = {
  id: string;
  src: StaticImageData;
  alt: string;
  platform: "Instantly" | "Smartlead";
  category: EvidenceCategory;
  caption: string;
  note?: string;
  /** Shown on the homepage teaser; the full set is /results-only. */
  featured?: boolean;
};

export const CATEGORY_LABELS: Record<EvidenceCategory, string> = {
  "campaign-performance": "Campaign performance",
  "inbox-placement": "Inbox placement & deliverability",
  infrastructure: "Infrastructure & sender health",
};

export const campaignEvidence: readonly CampaignEvidenceItem[] = [
  {
    id: "instantly-2025-08-05",
    src: instantly20250805,
    alt: "Instantly campaign report showing 5.6K total sent, a platform-reported 83.9% open rate, a 2.7% reply rate, and 25 opportunities",
    platform: "Instantly",
    category: "campaign-performance",
    caption:
      "Sustained campaign performance on Instantly — 5.6K sent, a platform-reported 83.9% open rate, and a 2.7% reply rate over roughly three months, generating 25 sales opportunities.",
    featured: true,
  },
  {
    id: "inbox-placement-test-result2",
    src: inboxPlacementTestResult2,
    alt: "Instantly inbox-placement test showing 3,980 test emails sent, with 3,907 of the 3,975 received reaching the inbox (98.29%), and a per-provider breakdown table",
    platform: "Instantly",
    category: "inbox-placement",
    caption:
      "An Instantly inbox-placement test — 3,980 test emails were sent, and 3,907 of the 3,975 received reached the inbox (98.29%) in this specific test, broken down by sender/recipient provider pairing.",
    note: "One specific test result — not a guaranteed or typical outcome for every campaign or provider pairing.",
    featured: true,
  },
  {
    id: "instantly-result-98",
    src: instantlyResult98,
    alt: "Instantly campaign report showing 759 sequence sends, a platform-reported 98% open rate, and 17 opportunities",
    platform: "Instantly",
    category: "campaign-performance",
    caption:
      "A second, smaller campaign on Instantly — 759 sequence sends, a platform-reported 98% open rate, and 17 sales opportunities generated.",
  },
  {
    id: "instantly-campaign-result-2",
    src: instantlyCampaignResult2,
    alt: "Instantly campaign report showing 127,149 sequence starts, 140 opportunities, and a 78.65% Positive Reply Rate among replies",
    platform: "Instantly",
    category: "campaign-performance",
    caption:
      "127,149 sequence starts generated 140 opportunities. Instantly reported a 78.65% Positive Reply Rate among replies—not an overall campaign reply rate.",
    note: "An exceptional individual result, not a typical or guaranteed outcome — most campaigns perform closer to the other examples shown here.",
  },
  {
    id: "campaign-result-smartlead",
    src: campaignResultSmartlead,
    alt: "Smartlead sender warm-up report showing 42 of 42 warm-up emails landing in the inbox and zero saved from spam",
    platform: "Smartlead",
    category: "infrastructure",
    caption:
      "Sender warm-up health on Smartlead — 42 of 42 warm-up emails landed in the inbox in this snapshot, with zero flagged as spam, the kind of ongoing infrastructure monitoring every managed inbox gets.",
  },
];

export function getFeaturedEvidence(): readonly CampaignEvidenceItem[] {
  return campaignEvidence.filter((item) => item.featured);
}

export function getEvidenceByCategory(category: EvidenceCategory): readonly CampaignEvidenceItem[] {
  return campaignEvidence.filter((item) => item.category === category);
}
