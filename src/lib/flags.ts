/** Feature flags. Offers stay in the codebase but are hidden when disabled. */
export const OFFERS_ENABLED =
  (process.env.NEXT_PUBLIC_OFFERS_ENABLED ?? "false").toLowerCase() === "true";
