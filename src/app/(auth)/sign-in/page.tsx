import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { getSafeRedirectPath } from "@/lib/safe-redirect";

export const metadata: Metadata = {
  title: "Sign in",
};

type SignInPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const rawRedirectTo = Array.isArray(params.redirectTo)
    ? params.redirectTo[0]
    : params.redirectTo;
  const redirectTo = getSafeRedirectPath(rawRedirectTo);

  const signUpHref = redirectTo
    ? `/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`
    : "/sign-up";

  return (
    <>
      <h1 className="text-xl font-semibold text-neutral-900">Sign in</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Welcome back. Enter your details to access your dashboard.
      </p>

      <div className="mt-6">
        <SignInForm redirectTo={redirectTo} />
      </div>

      <p className="mt-6 text-center text-sm text-neutral-600">
        Don&apos;t have an account?{" "}
        <Link href={signUpHref} className="font-medium text-neutral-900">
          Sign up
        </Link>
      </p>
    </>
  );
}
