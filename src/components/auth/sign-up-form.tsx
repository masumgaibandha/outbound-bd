"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@heroui/styles";
import { Input, Label } from "@heroui/react";

import { authClient } from "@/lib/auth-client";

type SignUpFormProps = {
  redirectTo?: string | null;
};

export function SignUpForm({ redirectTo }: SignUpFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name"));
    const email = String(formData.get("email"));
    const password = String(formData.get("password"));

    const { error } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setIsSubmitting(false);

    if (error) {
      setErrorMessage(error.message ?? "Unable to create your account.");
      return;
    }

    // New accounts always default to CLIENT server-side, so an /admin
    // destination (already validated against the same-origin allowlist —
    // see the sign-up page) would never apply here; fall back to /dashboard.
    router.push(redirectTo && !redirectTo.startsWith("/admin") ? redirectTo : "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" name="name" autoComplete="name" required fullWidth />
      </div>

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
          autoComplete="new-password"
          minLength={8}
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
        {isSubmitting ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
