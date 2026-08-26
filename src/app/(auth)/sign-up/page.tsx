import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign up",
};

type SignUpPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;
  const rawRedirectTo = Array.isArray(params.redirectTo)
    ? params.redirectTo[0]
    : params.redirectTo;
  const redirectTo = getSafeRedirectPath(rawRedirectTo);

  const signInHref = redirectTo
    ? `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/sign-in";

  return (
    <>
      <h1 className="text-xl font-semibold text-neutral-900">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-neutral-600">
        Get started with Outbound BD as a client.
      </p>

      <div className="mt-6">
        <SignUpForm redirectTo={redirectTo} />
      </div>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href={signInHref} className="font-medium text-neutral-900">
          Sign in
        </Link>
      </p>
    </>
  );
}
