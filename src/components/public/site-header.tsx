"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { buttonVariants } from "@heroui/styles";

import { ChevronDownIcon } from "@/components/public/icons";
import { Logo } from "@/components/public/logo";
import {
  NAV_ITEMS,
  STRATEGY_CALL_HREF,
  type NavLink,
} from "@/components/public/site-config";

function isNavLinkActive(pathname: string, href: string) {
  if (href.startsWith("/#")) {
    return false;
  }
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-20">
        <Link
          href="/"
          className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-royal"
        >
          <Logo className="h-6 w-auto sm:h-7" priority />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_ITEMS.map((item) => {
            if (item.type === "link") {
              const isActive = isNavLinkActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm font-medium transition-colors hover:text-ink ${
                    isActive ? "text-ink" : "text-ink/80"
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

        <div className="hidden items-center gap-3 lg:flex">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-ink/80 transition-colors hover:text-ink"
          >
            Client Login
          </Link>
          <Link
            href={STRATEGY_CALL_HREF}
            className={`${buttonVariants({ variant: "primary", size: "sm" })} rounded-lg`}
          >
            Book a Strategy Call
          </Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href={STRATEGY_CALL_HREF}
            className={`${buttonVariants({ variant: "primary", size: "sm" })} rounded-lg`}
          >
            Book a call
          </Link>
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-ink hover:bg-hairline/60"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
          >
            <MenuIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary"
          className="border-t border-hairline bg-canvas px-4 py-5 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              if (item.type === "link") {
                const isActive = isNavLinkActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`block py-2.5 text-sm font-medium ${
                        isActive ? "text-ink" : "text-ink/80"
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
                <li key={item.label}>
                  <details className="group" open={isGroupActive}>
                    <summary
                      className={`flex cursor-pointer list-none items-center justify-between gap-2 py-2.5 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden ${
                        isGroupActive ? "text-ink" : "text-ink/80"
                      }`}
                    >
                      {item.label}
                      <ChevronDownIcon
                        width={16}
                        height={16}
                        aria-hidden="true"
                        className="shrink-0 text-subtext transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <ul className="mt-1 flex flex-col gap-1 border-l border-hairline pl-4">
                      {item.items.map((sub) => {
                        const isSubActive = isNavLinkActive(pathname, sub.href);
                        return (
                          <li key={sub.href}>
                            <Link
                              href={sub.href}
                              onClick={() => setIsMenuOpen(false)}
                              aria-current={isSubActive ? "page" : undefined}
                              className={`block py-2 text-sm ${
                                isSubActive
                                  ? "font-medium text-ink"
                                  : "text-ink/80"
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
          <div className="mt-5 border-t border-hairline pt-5">
            <Link
              href="/sign-in"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-medium text-ink/80"
            >
              Client Login
            </Link>
          </div>
        </nav>
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
        className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-ink ${
          isActive ? "text-ink" : "text-ink/80"
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
          className="absolute top-full left-0 z-50 w-60 rounded-xl border border-hairline bg-canvas p-2 shadow-lg"
        >
          <ul className="flex flex-col">
            {items.map((item) => {
              const isItemActive = isNavLinkActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    aria-current={isItemActive ? "page" : undefined}
                    className={`block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-hairline/60 hover:text-ink ${
                      isItemActive ? "font-medium text-ink" : "text-ink/80"
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

function MenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {isOpen ? (
        <path d="M18 6 6 18M6 6l12 12" />
      ) : (
        <path d="M3 6h18M3 12h18M3 18h18" />
      )}
    </svg>
  );
}
