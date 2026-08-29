const nf = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nf0 = new Intl.NumberFormat("es-GT");

/** "Q 1,234.50" */
export const q = (n: number): string => `Q ${nf.format(n)}`;

/** "1,234.50" sin símbolo */
export const money = (n: number): string => nf.format(n);

/** "1,234" enteros con separador de miles */
export const int = (n: number): string => nf0.format(n);

/** "+20%" / "-5%" con signo */
export const pct = (n: number): string => `${n > 0 ? "+" : ""}${n}%`;
