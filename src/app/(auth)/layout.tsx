import type { ReactNode } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center justify-center bg-neutral-50 px-4 py-12">
      <Link
        href="/"
        className="mb-8 text-lg font-semibold tracking-tight text-neutral-900"
      >
        Outbound BD
      </Link>
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
