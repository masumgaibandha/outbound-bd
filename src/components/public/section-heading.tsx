type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
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
  const isOnNavy = tone === "canvas";

  return (
    <div
      className={`max-w-2xl ${isCenter ? "mx-auto text-center" : "text-left"}`}
    >
      {eyebrow ? (
        <p
          className={`text-xs font-semibold tracking-[0.14em] uppercase ${
            isOnNavy ? "text-azure" : "text-royal"
          }`}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={`mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl ${
          isOnNavy ? "text-canvas" : "text-ink"
        }`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 text-base leading-relaxed text-pretty sm:text-lg ${
            isOnNavy ? "text-azure/90" : "text-subtext"
          }`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
