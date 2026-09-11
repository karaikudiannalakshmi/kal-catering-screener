export const SESSIONS = ["Breakfast", "Lunch", "Dinner"];

export const ADDITIONAL_SERVICES = ["Crockery/buffet setup", "Decoration", "Transport/delivery van"];

export const ORDER_STATUS = {
  SCREENED: "screened",
  REVIEWED: "reviewed",
  CONFIRMED: "confirmed",
  EXECUTED: "executed",
};

export const STATUS_LABELS = {
  [ORDER_STATUS.SCREENED]: "Screened — awaiting review",
  [ORDER_STATUS.REVIEWED]: "Reviewed by senior",
  [ORDER_STATUS.CONFIRMED]: "Confirmed with customer",
  [ORDER_STATUS.EXECUTED]: "Order executed",
};

// Matches the units used in the Kitchen ERP menu-template screens
export const UNITS = ["KG", "G", "LT", "ML", "NOS"];
