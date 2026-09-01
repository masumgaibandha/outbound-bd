import { buttonVariants } from "@heroui/styles";
import { cn } from "tailwind-variants";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export type ButtonTone =
  | "action"
  | "ink"
  | "outline"
  | "quiet"
  /** For use on the dark bands (footer, final CTA), where terracotta needs lightening. */
  | "onDark"
  | "onDarkOutline";

const toneClasses: Record<ButtonTone, string> = {
  action:
    "bg-action text-white hover:bg-action-hover active:bg-action-hover shadow-[0_1px_2px_rgb(26_24_21/0.10)] hover:shadow-[0_8px_18px_-8px_rgb(180_70_42/0.55)]",
  ink: "bg-ink text-on-dark hover:bg-ink/88",
  outline:
    "border border-hairline text-ink bg-transparent hover:border-action hover:text-action",
  quiet: "text-ink bg-transparent hover:text-action",
  onDark:
    "bg-action-dark text-ink hover:brightness-110 active:brightness-95 shadow-[0_8px_18px_-10px_rgb(0_0_0/0.6)]",
  onDarkOutline:
    "border border-on-dark/25 text-on-dark bg-transparent hover:border-action-dark hover:text-action-dark",
};

const sizeClasses = {
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-[0.95rem]",
} as const;

/*
 * Shared by every button and button-styled link: a visible terracotta focus
 * ring, a 1px press lift, both suppressed under prefers-reduced-motion.
 */
const interactionClasses = cn(
  "rounded-full font-medium",
  "transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out",
  "focus-visible:outline-action focus-visible:outline-2 focus-visible:outline-offset-2",
  "active:translate-y-px",
  "motion-reduce:transition-none motion-reduce:active:translate-y-0",
);

type ButtonStyleOptions = {
  tone?: ButtonTone;
  size?: keyof typeof sizeClasses;
  fullWidth?: boolean;
  className?: string;
};

/** Composes HeroUI's button geometry with the ported brand tones. */
export function buttonClass({
  tone = "action",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    buttonVariants({ variant: "ghost", fullWidth }),
    interactionClasses,
    sizeClasses[size],
    toneClasses[tone],
    "inline-flex items-center justify-center gap-2",
    className,
  );
}

type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  ButtonStyleOptions & { children: ReactNode };

/** Anchor styled as a button — the standard CTA across every public page. */
export function ButtonLink({
  tone,
  size,
  fullWidth,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClass({ tone, size, fullWidth, className })}
      {...props}
    >
      {children}
    </Link>
  );
}
