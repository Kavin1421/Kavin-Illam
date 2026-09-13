import * as React from "react";
import { cn } from "cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground h-9 w-full min-w-0 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-base text-white outline-none transition-ki-fast md:text-sm",
        "focus-visible:border-cta/60 focus-visible:ring-[3px] focus-visible:ring-[rgba(0,208,132,0.22)]",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-white/[0.03]",
        "aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/25",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
