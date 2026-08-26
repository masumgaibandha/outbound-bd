"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@heroui/styles";
import { Input, Label } from "@heroui/react";

import { authClient } from "@/lib/auth-client";

type SignInFormProps = {
  redirectTo?: string | null;
};

export function SignInForm({ redirectTo }: SignInFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const { data, error } = await authClient.signIn.email({
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message ?? "Unable to sign in.");
      return;
    }

    // `redirectTo` was already validated server-side (see the sign-in page)
    // against an allowlist of same-origin destinations, so it's safe to use
    // directly here — this is what makes "back to what you were doing"
    // work without an open-redirect risk. A CLIENT redirected toward /admin
    // would just get bounced straight back by the admin layout's role
    // check, so skip that pointless hop and send them to their own
    // dashboard immediately instead.
    const isAdminOnlyDestination = redirectTo?.startsWith("/admin");
    const destination =
      redirectTo && !(isAdminOnlyDestination && data.user.role !== "ADMIN")
        ? redirectTo
        : data.user.role === "ADMIN"
          ? "/admin"
          : "/dashboard";

    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          fullWidth
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          fullWidth
        />
      </div>

      {errorMessage ? (
        <p role="alert" className="text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className={buttonVariants({
          variant: "primary",
          fullWidth: true,
        })}
      >
        {isSubmitting ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
