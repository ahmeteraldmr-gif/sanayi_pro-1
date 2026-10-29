import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("brand", className)}>
      <svg
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
        className="brand-symbol"
      >
        <rect width="40" height="40" rx="9" fill="currentColor" />
        <path
          d="M11 12h18v5H16v3h13v8H11v-5h13v-3H11z"
          className="brand-cutout"
        />
      </svg>
      <span>
        Sanayi<span className="brand-pro">Pro</span>
        <span className="brand-period">.</span>
      </span>
    </span>
  );
}
