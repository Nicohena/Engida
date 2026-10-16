import { HTMLAttributes } from "react";
import clsx from "clsx";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "primary" | "gold" | "gray" | "success" | "danger" | "warning";
}

export function Badge({ className, variant = "gray", ...props }: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        {
          "bg-primary/10 text-primary": variant === "primary",
          "bg-accent/15 text-accent": variant === "gold",
          "bg-slate-100 text-slate-600": variant === "gray",
          "bg-emerald-100 text-emerald-700": variant === "success",
          "bg-red-100 text-red-700": variant === "danger",
          "bg-amber-100 text-amber-700": variant === "warning",
        },
        className
      )}
      {...props}
    />
  );
}
