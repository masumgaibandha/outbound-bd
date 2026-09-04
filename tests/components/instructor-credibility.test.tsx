// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { instructor } from "@/data/masterclass-content";

// The founder portrait is a static `next/image` import (StaticImageData),
// unrelated to this file's subject (the Upwork profile screenshot). Vite's
// default asset transform returns a bare URL string rather than a
// {src,width,height} object, which next/image requires for a non-`fill`,
// non-explicit-dimensions <Image> — stub it so rendering the real component
// doesn't fail on that unrelated image.
vi.mock("@/assets/founder/abdullah-al-masum-portrait.webp", () => ({
  default: { src: "/mock-portrait.webp", width: 800, height: 800, blurDataURL: "" },
}));

const { InstructorCredibility } = await import("@/components/masterclass/InstructorCredibility");

/**
 * Regression test for the Upwork profile screenshot's Vercel Image
 * Optimization 402 (`/_next/image` billing). The fix is `unoptimized` on
 * this one `<Image>` — matches the treatment every other masterclass/agency
 * evidence screenshot already gets (see `MasterclassEvidenceGallery`,
 * `ResultsProof`'s `clientFeedback`, `evidence-lightbox.tsx`,
 * `campaign-evidence-section.tsx`).
 */
describe("InstructorCredibility — Upwork profile proof image", () => {
  it("renders the Upwork profile screenshot unoptimized, so the browser requests the original static asset instead of /_next/image", () => {
    render(<InstructorCredibility />);

    const image = screen.getByAltText(instructor.proof.alt);
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("src")).toBe(instructor.proof.src);
    expect(image.getAttribute("src")).not.toContain("/_next/image");
    // next/image only omits srcset entirely (rather than generating a
    // /_next/image?url=...&w=... set) when unoptimized is set.
    expect(image.getAttribute("srcset")).toBeFalsy();
  });

  it("preserves layout, dimensions, caption, and the existing open-in-new-tab link behavior unchanged", () => {
    render(<InstructorCredibility />);

    const image = screen.getByAltText(instructor.proof.alt);
    expect(image.getAttribute("width")).toBe(String(instructor.proof.width));
    expect(image.getAttribute("height")).toBe(String(instructor.proof.height));
    expect(screen.getByText(instructor.proof.caption)).toBeInTheDocument();

    const newTabLink = Array.from(document.querySelectorAll("a")).find(
      (a) => a.getAttribute("href") === instructor.proof.src,
    );
    expect(newTabLink).toBeDefined();
    expect(newTabLink).toHaveAttribute("target", "_blank");
    expect(newTabLink).toHaveAttribute("rel", "noopener noreferrer");
  });
});

/**
 * Source-level guard: every masterclass evidence/proof screenshot (a
 * public-path PNG, as opposed to a bundled portrait asset) must pass
 * `unoptimized` to its `<Image>` so it never depends on Vercel's billed
 * `/_next/image` optimizer — the same convention the agency evidence
 * gallery (`campaign-evidence-section.tsx`, `evidence-lightbox.tsx`)
 * already follows. Catches a future regression that re-adds one of these
 * `<Image>` usages without `unoptimized`, without needing a full render for
 * every case.
 */
describe("masterclass evidence screenshots — no unexpected /_next/image usage", () => {
  const componentsDir = path.resolve(__dirname, "../../src/components/masterclass");

  const cases = [
    { file: "InstructorCredibility.tsx", srcExpr: "instructor.proof.src" },
    { file: "ResultsProof.tsx", srcExpr: "clientFeedback.src" },
    { file: "MasterclassEvidenceGallery.tsx", srcExpr: "asset.src" },
  ];

  it.each(cases)("$file's evidence <Image src={$srcExpr}> has unoptimized", ({ file, srcExpr }) => {
    const source = readFileSync(path.join(componentsDir, file), "utf8");
    const imageBlockMatch = source.match(new RegExp(`<Image\\b[\\s\\S]*?src=\\{${srcExpr.replace(".", "\\.")}\\}[\\s\\S]*?/>`));
    expect(imageBlockMatch, `expected to find an <Image src={${srcExpr}}> block in ${file}`).toBeTruthy();
    expect(imageBlockMatch![0]).toMatch(/\bunoptimized\b/);
  });
});
