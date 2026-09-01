type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  /** "canvas" is for use on the dark bands (footer, final CTA) — inverts the palette. */
  tone?: "ink" | "canvas";
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "ink",
}: SectionHeadingProps) {
  const isCenter = align === "center";
  const onDark = tone === "canvas";

  return (
    <div
      className={`max-w-3xl ${isCenter ? "mx-auto text-center" : "text-left"}`}
      data-reveal
    >
      {eyebrow ? (
        <p
          className={`flex items-center gap-3 text-xs font-semibold tracking-[0.18em] uppercase ${
            isCenter ? "justify-center" : ""
          } ${onDark ? "text-on-dark-muted" : "text-ink-muted"}`}
        >
          <span
            aria-hidden="true"
            className={`h-px w-8 shrink-0 ${onDark ? "bg-action-dark" : "bg-action"}`}
          />
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`type-section mt-5 text-balance ${onDark ? "text-on-dark" : "text-ink"}`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mx-auto mt-6 max-w-prose text-base leading-relaxed text-pretty md:text-lg ${
            onDark ? "text-on-dark-muted" : "text-ink-muted"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
