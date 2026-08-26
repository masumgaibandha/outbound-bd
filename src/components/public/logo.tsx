import Image from "next/image";

import lockupOnCanvas from "@/assets/logos/outbound-bd-lockup-transparent.png";
import lockupOnNavy from "@/assets/logos/outbound-bd-lockup-white-transparent.png";
import markOnCanvas from "@/assets/logos/outbound-bd-mark-transparent.png";
import markOnNavy from "@/assets/logos/outbound-bd-mark-white-transparent.png";

type LogoProps = {
  /** Which background this logo will sit on, so the correct light/navy asset is used. */
  surface?: "canvas" | "navy";
  /** Full lockup (mark + wordmark) or the mark alone. */
  variant?: "lockup" | "mark";
  className?: string;
  priority?: boolean;
};

const SOURCES = {
  canvas: { lockup: lockupOnCanvas, mark: markOnCanvas },
  navy: { lockup: lockupOnNavy, mark: markOnNavy },
} as const;

export function Logo({
  surface = "canvas",
  variant = "lockup",
  className,
  priority,
}: LogoProps) {
  return (
    <Image
      src={SOURCES[surface][variant]}
      alt="Outbound BD"
      className={className}
      priority={priority}
    />
  );
}
