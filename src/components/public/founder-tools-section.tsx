import { SectionHeading } from "@/components/public/section-heading";

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
    <section className="border-t border-hairline py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Tools"
          title="Run inside the platforms clients already trust"
          align="left"
        />

        <div className="mt-10 grid gap-10 sm:grid-cols-3">
          {TOOL_CATEGORIES.map((category) => (
            <div key={category.label}>
              <h3 className="text-sm font-semibold text-ink">
                {category.label}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {category.tools.map((tool) => (
                  <li
                    key={tool}
                    className="rounded-md border border-hairline px-3 py-1.5 text-sm text-subtext"
                  >
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
