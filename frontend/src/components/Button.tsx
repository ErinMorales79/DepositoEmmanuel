import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

const base: Record<Variant, string> = {
  primary: "btn btn-primary",
  secondary: "btn",
  ghost: "btn btn-ghost",
};

export default function Button({
  variant = "secondary",
  icon,
  children,
  className = "",
  ...rest
}: Props) {
  return (
    <button className={`${base[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}
