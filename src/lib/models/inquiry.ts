import "server-only";

import { Schema, model, models } from "mongoose";

export type InquiryStatus = "NEW";

export interface InquiryDocument {
  name: string;
  email: string;
  company: string;
  website: string;
  service: string;
  targetMarket: string;
  monthlyOutreachVolume: string;
  budgetRange: string;
  currentOutreachSetup: string;
  goals: string;
  privacyConsent: boolean;
  status: InquiryStatus;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const inquirySchema = new Schema<InquiryDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    company: { type: String, required: true, trim: true },
    website: { type: String, required: true, trim: true },
    service: { type: String, required: true },
    targetMarket: { type: String, required: true, trim: true },
    monthlyOutreachVolume: { type: String, required: true },
    budgetRange: { type: String, required: true },
    currentOutreachSetup: { type: String, trim: true, default: "" },
    goals: { type: String, required: true, trim: true },
    privacyConsent: { type: Boolean, required: true },
    status: { type: String, required: true, default: "NEW" },
    ipAddress: { type: String },
  },
  { timestamps: true },
);

inquirySchema.index({ ipAddress: 1, createdAt: -1 });
inquirySchema.index({ email: 1, company: 1, createdAt: -1 });

export const Inquiry =
  models.Inquiry ?? model<InquiryDocument>("Inquiry", inquirySchema);
