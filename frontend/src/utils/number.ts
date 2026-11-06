// Sequelize sends DECIMAL and JSONB columns back as strings, and null when a value
// was never set, so every amount read from the API goes through this before maths.
export const safeNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};
