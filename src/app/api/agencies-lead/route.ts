import { agencyInquirySchema } from "@/lib/agency-inquiry-schema";
import { handleLandingLeadPost } from "@/lib/landing-lead-handler";

// The protections, persistence and best-effort side effects are shared with
// every landing-page form — see src/lib/landing-lead-handler.ts.
export async function POST(request: Request) {
  return handleLandingLeadPost(request, {
    route: "/api/agencies-lead",
    source: "agencies-landing",
    schema: agencyInquirySchema,
    autoReplyTopic: "your agency",
  });
}
