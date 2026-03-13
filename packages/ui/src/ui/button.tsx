import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type Variant = "primary" | "secondary";

type ButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
  }
>;

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-emerald-500 text-slate-950 hover:bg-emerald-400 focus-visible:outline-emerald-300",
  secondary:
    "bg-slate-800 text-slate-100 hover:bg-slate-700 focus-visible:outline-slate-400",
};

export function Button({
  children,
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${variantStyles[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
