import type { StaticImageData } from "next/image";

import campaignSendReplyVolume from "@/assets/results/campaign-send-reply-volume.png";
import inboxPlacementTest from "@/assets/results/inbox-placement-test.png";

/**
 * Real screenshots from the founder's own cold-email outreach work —
 * sourced from masumdev.com's design-reference ZIP (read-only; nothing
 * there was modified), cropped there to remove any client name, email
 * address, or sending domain before they were ever published anywhere.
 * These are selected results from Abdullah's independent client work.
 */
export type CampaignEvidenceItem = {
  id: string;
  src: StaticImageData;
  alt: string;
  caption: string;
  note?: string;
};

export const campaignEvidence: readonly CampaignEvidenceItem[] = [
  {
    id: "campaign-send-reply-volume",
    src: campaignSendReplyVolume,
    alt: "Cold email campaign dashboard showing sent, opens, and reply volume over a 3-month period",
    caption: "Real send and reply volume from a sustained campaign — one connected program, run consistently over months.",
  },
  {
    id: "inbox-placement-test",
    src: inboxPlacementTest,
    alt: "Inbox placement test result showing 3,875 of 3,875 emails landing in the inbox (100%), with 0 in spam",
    caption: "A clean inbox-placement test: 3,875 of 3,875 emails landed in the inbox, none in spam.",
    note: "One specific test result — not a guaranteed or typical outcome for every campaign.",
  },
];
