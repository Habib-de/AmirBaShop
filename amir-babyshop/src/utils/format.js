export const formatCurrency = (amount) => {
  const num = Number(amount) || 0;
  return `KES ${num.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export const calcDiscounted = (price, original) =>
  original ? Math.round(((original - price) / original) * 100) : 0;