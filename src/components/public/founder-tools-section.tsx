import { SectionHeading } from "@/components/public/section-heading";
import { Section } from "@/components/public/section";

const TOOL_CATEGORIES = [
  {
    label: "Sending & campaigns",
    tools: ["Instantly", "Smartlead", "ReachInbox", "Lemlist"],
  },
  {
    label: "Data & prospecting",
    tools: ["Apollo", "LinkedIn Sales Navigator", "Clay"],
  },
  {
    label: "Workspace & operations",
    tools: ["Google Workspace", "Microsoft 365"],
  },
] as const;

export function FounderToolsSection() {
  return (
    <Section tone="canvas" compact labelledBy="tools-heading">
      <SectionHeading
        eyebrow="Tools"
        title="Run inside the platforms clients already trust"
        align="left"
      />

      <div className="mt-10 grid gap-10 sm:grid-cols-3">
        {TOOL_CATEGORIES.map((category) => (
          <div key={category.label}>
            <h3 className="text-ink text-sm font-semibold">
              {category.label}
            </h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {category.tools.map((tool) => (
                <li
                  key={tool}
                  className="border-hairline text-ink-muted rounded-full border px-3 py-1.5 text-sm"
                >
                  {tool}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
