import Link from "next/link";

import { CalendarIcon, CircleAlertIcon, ShieldIcon } from "@/components/public/icons";
import { MasterclassRegistrationForm } from "@/components/masterclass/MasterclassRegistrationForm";
import {
  MasterclassSection,
  eyebrowClass,
  eyebrowDotClass,
} from "@/components/masterclass/MasterclassSection";
import { legalPageLinks } from "@/data/legal-content";
import { masterclassConfig, registration } from "@/data/masterclass-content";
import { getManualPaymentEnv, isRegistrationOperationallyReady } from "@/lib/masterclass/env";
import { formatBDT } from "@/lib/masterclass/format";

const fieldClass =
  "border-hairline bg-canvas text-ink placeholder:text-ink-muted/70 focus-visible:border-ink focus-visible:outline-action w-full rounded-lg border px-4 py-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const labelClass = "text-ink font-bengali block text-sm font-medium";

const legalLinkClass =
  "text-ink decoration-action hover:text-action focus-visible:outline-action rounded-sm font-medium underline decoration-2 underline-offset-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

const checkboxClass =
  "border-hairline text-action focus-visible:outline-action mt-0.5 size-4 shrink-0 rounded disabled:cursor-not-allowed disabled:opacity-60";

/**
 * `formEnabled` is the full operational-readiness gate, computed here,
 * server-side, from four independent signals — never a single flag, and
 * never a `NEXT_PUBLIC_` mirror of any server-only value:
 *
 * 1. `masterclassConfig.checkoutEnabled` (content/config flag).
 * 2. `MASTERCLASS_REGISTRATION_ENABLED`, a published privacy policy, and
 *    complete Turnstile/rate-limit/origin security configuration — all
 *    three folded into `isRegistrationOperationallyReady()`
 *    (`@/lib/masterclass/env`), so this component never touches a raw
 *    `SecurityEnv` value, secret or not.
 * 3. A public Turnstile site key actually being present.
 *
 * Only when all hold does this render the interactive
 * `MasterclassRegistrationForm` (a Client Component) instead of the static,
 * fully-disabled form below — and even then, only `formEnabled` (a boolean)
 * and the already-public site key ever reach that component; no readiness
 * detail, secret, or `SecurityEnv` value crosses the server/client
 * boundary. Ported from the MasumDev masterclass source, import paths only.
 */
interface RegistrationProps {
  priceBDT: number;
  isEarlyBird: boolean;
  regularPriceBDT: number;
}

export function Registration({ priceBDT, isEarlyBird, regularPriceBDT }: RegistrationProps) {
  const { checkoutEnabled } = masterclassConfig;
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const formEnabled = checkoutEnabled && isRegistrationOperationallyReady() && Boolean(turnstileSiteKey);
  const paymentMethods = getManualPaymentEnv();

  return (
    <MasterclassSection id="registration" labelledBy="registration-heading">
      <p className={eyebrowClass}>
        <span aria-hidden="true" className={eyebrowDotClass} />
        {registration.label}
      </p>
      <h2
        id="registration-heading"
        className="type-section font-bengali text-ink mt-4 max-w-2xl text-balance"
      >
        {registration.heading}
      </h2>
      <p className="text-ink-muted mt-4 max-w-prose leading-relaxed md:text-lg">
        {registration.description}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-8">
        <div className="border-hairline bg-surface h-fit border p-6 md:p-8">
          <dl className="space-y-5">
            <div>
              <dt className="text-ink-muted font-bengali flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase">
                {isEarlyBird ? registration.earlyBirdLabel : registration.priceLabel}
              </dt>
              <dd className="font-heading text-ink mt-1.5 text-3xl tracking-tight">
                {formatBDT(priceBDT)}
              </dd>
              {isEarlyBird ? (
                <p className="text-ink-muted font-bengali mt-1 text-xs">
                  {registration.regularPricePrefix} {formatBDT(regularPriceBDT)}
                </p>
              ) : null}
            </div>
            <div className="border-hairline border-t pt-5">
              <dt className="text-ink-muted font-bengali flex items-center gap-2 text-xs font-semibold tracking-[0.12em] uppercase">
                <CalendarIcon className="size-3.5 shrink-0" aria-hidden="true" />
                {registration.dateLabel}
              </dt>
              <dd className="text-ink font-bengali mt-1.5 text-sm leading-relaxed">
                {registration.dateValue}
              </dd>
            </div>
          </dl>

          <p className="text-ink-muted font-bengali border-hairline mt-6 flex items-start gap-2.5 border-t pt-5 text-sm leading-relaxed">
            <ShieldIcon className="text-action mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {registration.paymentNote}
          </p>
        </div>

        {formEnabled ? (
          <MasterclassRegistrationForm
            siteKey={turnstileSiteKey as string}
            priceBDT={priceBDT}
            paymentMethods={paymentMethods}
          />
        ) : (
          <form
            noValidate
            aria-describedby="registration-disabled-note"
            className="border-hairline bg-surface border p-6 md:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="mc-name" className={labelClass}>
                  {registration.fields.name}
                </label>
                <input
                  id="mc-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder={registration.fields.namePlaceholder}
                  disabled
                  className={`${fieldClass} mt-2 disabled:cursor-not-allowed disabled:opacity-60`}
                />
              </div>

              <div>
                <label htmlFor="mc-email" className={labelClass}>
                  {registration.fields.email}
                </label>
                <input
                  id="mc-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={registration.fields.emailPlaceholder}
                  disabled
                  className={`${fieldClass} mt-2 disabled:cursor-not-allowed disabled:opacity-60`}
                />
              </div>

              <div>
                <label htmlFor="mc-phone" className={labelClass}>
                  {registration.fields.phone}
                </label>
                <input
                  id="mc-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={registration.fields.phonePlaceholder}
                  disabled
                  className={`${fieldClass} mt-2 disabled:cursor-not-allowed disabled:opacity-60`}
                />
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  id="mc-consent"
                  name="consent"
                  type="checkbox"
                  required
                  disabled
                  className={checkboxClass}
                />
                <label htmlFor="mc-consent" className="text-ink font-bengali text-sm leading-relaxed">
                  {registration.consentPrefix}{" "}
                  <Link href={legalPageLinks[1].href} className={legalLinkClass}>
                    {legalPageLinks[1].label}
                  </Link>
                  ,{" "}
                  <Link href={legalPageLinks[0].href} className={legalLinkClass}>
                    {legalPageLinks[0].label}
                  </Link>{" "}
                  {registration.consentJoiner}{" "}
                  <Link href={legalPageLinks[2].href} className={legalLinkClass}>
                    {legalPageLinks[2].label}
                  </Link>{" "}
                  {registration.consentSuffix}
                </label>
              </div>

              {/* Separate and independently optional — never bundled with the required checkbox above. */}
              <div className="flex items-start gap-3">
                <input
                  id="mc-marketing-consent"
                  name="marketingConsent"
                  type="checkbox"
                  disabled
                  className={checkboxClass}
                />
                <label
                  htmlFor="mc-marketing-consent"
                  className="text-ink-muted font-bengali text-sm leading-relaxed"
                >
                  {registration.marketingConsentLabel}
                </label>
              </div>
            </div>

            {/* Honeypot — mirrors the contact form's `botcheck` convention. Left inert until this form is wired to a real endpoint. */}
            <label htmlFor="mc-botcheck" className="absolute left-[-9999px]" aria-hidden="true">
              Leave this field empty
              <input
                id="mc-botcheck"
                type="checkbox"
                name="botcheck"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>

            <button
              type="submit"
              disabled
              aria-disabled="true"
              className="bg-action hover:bg-action-hover focus-visible:outline-action font-bengali mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full px-7 text-[0.95rem] font-medium text-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:bg-ink/40 disabled:hover:bg-ink/40"
            >
              {registration.submitDisabledLabel}
            </button>

            <p
              id="registration-disabled-note"
              className="text-ink-muted font-bengali border-hairline bg-canvas mt-4 flex items-start gap-2.5 border p-4 text-xs leading-relaxed"
            >
              <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {registration.devNotice}
            </p>
          </form>
        )}
      </div>
    </MasterclassSection>
  );
}
