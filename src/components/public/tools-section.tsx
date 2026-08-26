import { SectionHeading } from "@/components/public/section-heading";

const TOOL_CATEGORIES = [
  {
    label: "Sending & deliverability",
    tools: ["Instantly", "Smartlead", "Lemlist", "Mailgun"],
  },
  {
    label: "Data & enrichment",
    tools: ["Apollo.io", "Clay", "Clearbit"],
  },
  {
    label: "CRM & handoff",
    tools: ["HubSpot", "Salesforce", "Pipedrive"],
  },
] as const;

export function ToolsSection() {
  return (
    <section className="border-t border-hairline py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Platform expertise"
          title="We work inside the tools your team already trusts"
          description="No proprietary lock-in — your data and infrastructure stay portable across the platforms below."
        />

        <div className="mt-14 grid gap-10 sm:grid-cols-3">
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
