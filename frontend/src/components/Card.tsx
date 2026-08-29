import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
  bodyClass?: string;
}

export default function Card({
  children,
  className = "",
  title,
  action,
  bodyClass = "p-5",
}: Props) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-5">
          {title ? <h3 className="text-[15px] font-semibold">{title}</h3> : <span />}
          {action}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}
