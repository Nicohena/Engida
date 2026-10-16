import { ButtonHTMLAttributes, forwardRef } from "react";
import clsx from "clsx";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "accent";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={clsx(
          "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
          {
            "bg-primary text-white hover:bg-primary-dark shadow-sm": variant === "primary",
            "bg-white text-primary border border-primary hover:bg-primary/5": variant === "secondary",
            "bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-50": variant === "outline",
            "bg-transparent text-slate-600 hover:bg-slate-100": variant === "ghost",
            "bg-accent text-white hover:bg-accent-light shadow-sm": variant === "accent",
          },
          {
            "text-sm px-3 py-1.5": size === "sm",
            "text-sm px-5 py-2.5": size === "md",
            "text-base px-7 py-3.5": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
