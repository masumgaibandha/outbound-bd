"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { buttonVariants } from "@heroui/styles";

import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isSigningOut}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
