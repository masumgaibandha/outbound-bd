import Script from "next/script";

/*
 * No `declare global` for `window.fbq` here — see
 * `src/lib/tracking/fire-lead-pixel-event.ts`'s doc comment for why.
 *
 * The AGENCY pixel — entirely separate dataset from
 * `src/components/masterclass/MetaPixel.tsx`. Rendered only by
 * `TrackingGate` (a Client Component), so this never needs a "use client"
 * directive of its own: it has no hooks, and `next/script` works from
 * either a Server or a Client parent. PageView only — the agency site has
 * no per-page "product" concept, so there's no ViewContent payload to send
 * the way the masterclass pixel does.
 */
interface MetaPixelProps {
  pixelId: string;
}

export function MetaPixel({ pixelId }: MetaPixelProps) {
  if (!pixelId) return null;

  return (
    <Script
      id="agency-meta-pixel-base"
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
`,
      }}
    />
  );
}
