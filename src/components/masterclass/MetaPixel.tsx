import Script from "next/script";

/*
 * No `declare global { interface Window { fbq... } }` here — the fbq calls
 * below live entirely inside the inline-script template string (real
 * browser JS, not type-checked TypeScript), so this file never touches
 * `window.fbq` as a typed value. `MasterclassRegistrationForm.tsx` is the
 * one file that actually calls `window.fbq(...)` from TypeScript (for
 * `InitiateCheckout`) and owns that global's type declaration.
 */

interface MetaPixelProps {
  pixelId: string;
  contentName: string;
  currency: string;
  value: number;
}

/**
 * Server Component — the Facebook bootstrap snippet defines `fbq`
 * synchronously and queues calls until `fbevents.js` finishes loading, so
 * `init`/`PageView`/`ViewContent` can all be issued in the same inline
 * script with no client-side effect or load race to manage. `next/script`
 * dedupes by `id`, so this only ever executes once per page load even if a
 * parent re-renders.
 *
 * Rendered directly from `page.tsx` whenever `NEXT_PUBLIC_META_PIXEL_ID` is
 * set — it fires unconditionally on every page load, with no consent gate.
 *
 * `InitiateCheckout` and the Purchase event are NOT fired from this
 * component — see `MasterclassRegistrationForm.tsx` (`InitiateCheckout`,
 * client-side, at genuine registration start) and
 * `src/lib/masterclass/meta-capi.ts` (`Purchase`, server-side only, fired at
 * `REVIEW → PAID` — see that file's doc comment for why there is
 * deliberately no browser Purchase call anywhere in this codebase).
 */
export function MetaPixel({ pixelId, contentName, currency, value }: MetaPixelProps) {
  if (!pixelId) return null;

  const viewContentPayload = JSON.stringify({
    content_name: contentName,
    content_type: "product",
    currency,
    value,
  });

  return (
    <Script
      id="meta-pixel-base"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');
fbq('track', 'ViewContent', ${viewContentPayload});
`,
      }}
    />
  );
}
