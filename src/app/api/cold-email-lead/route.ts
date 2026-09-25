import { coldEmailInquirySchema } from "@/lib/cold-email-inquiry-schema";
import { handleLandingLeadPost } from "@/lib/landing-lead-handler";

// The /cold-email landing form. Same protections, persistence and
// best-effort side effects as /api/agencies-lead — see
// src/lib/landing-lead-handler.ts.
export async function POST(request: Request) {
  return handleLandingLeadPost(request, {
    route: "/api/cold-email-lead",
    source: "cold-email-landing",
    schema: coldEmailInquirySchema,
    autoReplyTopic: "your business",
  });
}
