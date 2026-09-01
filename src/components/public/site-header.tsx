"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonClass, ButtonLink } from "@/components/public/button";
import { Container } from "@/components/public/container";
import { ChevronDownIcon, MenuIcon, XIcon } from "@/components/public/icons";
import { Logo } from "@/components/public/logo";
import {
  NAV_ITEMS,
  STRATEGY_CALL_HREF,
  STRATEGY_CALL_LABEL,
  STRATEGY_CALL_LINK_PROPS,
  type NavLink,
} from "@/components/public/site-config";

function isNavLinkActive(pathname: string, href: string) {
  if (href.startsWith("/#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  // Closes the mobile menu on navigation. Adjusted during render (React's
  // recommended pattern for state that depends on a changing prop) rather
  // than in an effect, which would cause an extra cascading render.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsMenuOpen(false);
  }

  useEffect(() => {
    if (!isMenuOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  return (
    <header className="border-hairline bg-canvas/95 sticky top-0 z-50 border-b backdrop-blur-sm">
      <Container className="flex h-18 items-center justify-between gap-6 md:h-20">
        <Link
          href="/"
          aria-label="Outbound BD — home"
          className="focus-visible:outline-action rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Logo className="h-8 w-auto sm:h-9 lg:h-10" priority />
        </Link>

        <div className="flex items-center gap-2 lg:flex-1 lg:justify-end lg:gap-8">
          <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map((item) => {
              if (item.type === "link") {
                const active = isNavLinkActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`focus-visible:outline-action relative rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-full after:origin-left after:bg-action after:transition-transform ${
                      active
                        ? "text-action after:scale-x-100"
                        : "text-ink-muted hover:text-ink after:scale-x-0"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              }
              return (
                <NavDropdown
                  key={item.label}
                  label={item.label}
                  items={item.items}
                  pathname={pathname}
                />
              );
            })}
          </nav>

          <ButtonLink
            href={STRATEGY_CALL_HREF}
            tone="action"
            className="hidden sm:inline-flex"
            {...STRATEGY_CALL_LINK_PROPS}
          >
            {STRATEGY_CALL_LABEL}
          </ButtonLink>

          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            className={buttonClass({
              tone: "outline",
              className: "size-11 px-0 lg:hidden",
            })}
          >
            {isMenuOpen ? (
              <XIcon width={19} height={19} aria-hidden="true" />
            ) : (
              <MenuIcon width={19} height={19} aria-hidden="true" />
            )}
          </button>
        </div>
      </Container>

      {isMenuOpen ? (
        <div
          id="mobile-nav"
          className="border-hairline bg-canvas fixed inset-x-0 top-18 bottom-0 z-40 border-t md:top-20 lg:hidden"
        >
          <nav
            aria-label="Primary"
            className="h-full overflow-y-auto px-6 py-8"
          >
            <ul className="flex flex-col">
              {NAV_ITEMS.map((item) => {
                if (item.type === "link") {
                  const active = isNavLinkActive(pathname, item.href);
                  return (
                    <li key={item.href} className="border-hairline border-b">
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`font-heading focus-visible:outline-action block py-4 text-2xl focus-visible:outline-2 focus-visible:-outline-offset-2 ${
                          active ? "text-action" : "text-ink"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                }

                const isGroupActive = item.items.some((sub) =>
                  isNavLinkActive(pathname, sub.href),
                );
                return (
                  <li key={item.label} className="border-hairline border-b">
                    <details className="group" open={isGroupActive}>
                      <summary
                        className={`font-heading flex cursor-pointer list-none items-center justify-between gap-2 py-4 text-2xl marker:content-none [&::-webkit-details-marker]:hidden ${
                          isGroupActive ? "text-action" : "text-ink"
                        }`}
                      >
                        {item.label}
                        <ChevronDownIcon
                          width={20}
                          height={20}
                          aria-hidden="true"
                          className="text-ink-muted shrink-0 transition-transform duration-200 group-open:rotate-180"
                        />
                      </summary>
                      <ul className="flex flex-col gap-1 pb-4">
                        {item.items.map((sub) => {
                          const subActive = isNavLinkActive(pathname, sub.href);
                          return (
                            <li key={sub.href}>
                              <Link
                                href={sub.href}
                                className={`block py-2 text-base ${
                                  subActive
                                    ? "text-action font-medium"
                                    : "text-ink-muted"
                                }`}
                              >
                                {sub.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  </li>
                );
              })}
            </ul>

            <Link
              href={STRATEGY_CALL_HREF}
              className={buttonClass({
                tone: "action",
                size: "lg",
                fullWidth: true,
                className: "mt-8",
              })}
              {...STRATEGY_CALL_LINK_PROPS}
            >
              {STRATEGY_CALL_LABEL}
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function NavDropdown({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavLink[];
  pathname: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const isActive = items.some((item) => isNavLinkActive(pathname, item.href));

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node)) {
          setIsOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setIsOpen(true)}
        className={`focus-visible:outline-action flex items-center gap-1 rounded-sm text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 ${
          isActive ? "text-action" : "text-ink-muted hover:text-ink"
        }`}
      >
        {label}
        <ChevronDownIcon
          width={14}
          height={14}
          aria-hidden="true"
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div
          id={menuId}
          className="border-hairline bg-surface absolute top-full left-0 z-50 w-60 rounded-xl border p-2 shadow-lg"
        >
          <ul className="flex flex-col">
            {items.map((item) => {
              const itemActive = isNavLinkActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={itemActive ? "page" : undefined}
                    className={`hover:bg-canvas-alt block rounded-lg px-3 py-2 text-sm transition-colors ${
                      itemActive ? "text-action font-medium" : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
