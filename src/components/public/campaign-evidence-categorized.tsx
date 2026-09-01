import {
  CATEGORY_LABELS,
  campaignEvidence,
  type EvidenceCategory,
} from "@/components/public/campaign-evidence-data";
import { CampaignEvidenceSection } from "@/components/public/campaign-evidence-section";

const CATEGORY_ORDER: EvidenceCategory[] = [
  "campaign-performance",
  "inbox-placement",
  "infrastructure",
];

/**
 * The expanded /results evidence set, grouped by category so campaign
 * performance, inbox-placement tests, and infrastructure evidence each
 * read as their own claim rather than one undifferentiated gallery.
 */
export function CampaignEvidenceCategorized() {
  return (
    <div className="flex flex-col gap-14">
      {CATEGORY_ORDER.map((category) => {
        const items = campaignEvidence.filter((item) => item.category === category);
        if (items.length === 0) return null;

        return (
          <div key={category}>
            <h3 className="text-ink-muted text-xs font-semibold tracking-[0.16em] uppercase">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="mt-6">
              <CampaignEvidenceSection items={items} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
