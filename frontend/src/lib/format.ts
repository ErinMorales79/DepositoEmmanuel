const nf = new Intl.NumberFormat("es-GT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const nf0 = new Intl.NumberFormat("es-GT");

// da "Q 1,234.50"
export const q = (n: number): string => `Q ${nf.format(n)}`;

// da "1,234.50" sin el simbolo de quetzal
export const money = (n: number): string => nf.format(n);

// da "1,234" solo enteros, con comas
export const int = (n: number): string => nf0.format(n);

// da "+20%" o "-5%" con el signo
export const pct = (n: number): string => `${n > 0 ? "+" : ""}${n}%`;
