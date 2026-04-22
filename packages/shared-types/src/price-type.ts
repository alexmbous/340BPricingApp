export const PriceTypes = {
  RETAIL_CASH: 'RETAIL_CASH',
  DISCOUNT_CARD: 'DISCOUNT_CARD',
  CONTRACT_340B: 'CONTRACT_340B',
  INSURANCE_EST: 'INSURANCE_EST',
} as const;

export type PriceType = (typeof PriceTypes)[keyof typeof PriceTypes];

export interface PriceTypeDisplay {
  label: string;
  shortLabel: string;
  description: string;
  tone: 'neutral' | 'info' | 'success' | 'warning';
}

// Labels used in the mobile UI. Centralized so backend and mobile agree.
export const PRICE_TYPE_DISPLAY: Record<PriceType, PriceTypeDisplay> = {
  RETAIL_CASH: {
    label: 'Retail cash price',
    shortLabel: 'Cash',
    description: "Pharmacy's listed cash price without insurance or discount cards.",
    tone: 'neutral',
  },
  DISCOUNT_CARD: {
    label: 'Discount card price',
    shortLabel: 'Discount',
    description: 'Estimated price using a discount-card partner network.',
    tone: 'info',
  },
  CONTRACT_340B: {
    label: '340B-eligible price',
    shortLabel: '340B',
    description:
      'Price available under a 340B contract-pharmacy arrangement with your clinic. Eligibility determined by your clinic.',
    tone: 'success',
  },
  INSURANCE_EST: {
    label: 'Estimated insurance price',
    shortLabel: 'Insurance est.',
    description: "Estimated out-of-pocket based on a plan benefit. Actual cost may vary.",
    tone: 'warning',
  },
};
