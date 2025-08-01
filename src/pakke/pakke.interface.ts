export interface PakkeLabelInstructions {
  label: string;
  icon: string;
}

export interface PakkeQuote {
  CourierCode: string;
  CourierName: string;
  CourierServiceId: string;
  CourierServiceName: string;
  DeliveryDays: string;
  CouponCode: null;
  ShipmentAmount: number;
  ShipmentSubtotalAmount: number;
  ShipmentVatAmount: number;
  InsuranceAmount: number;
  InsuranceSubtotalAmount: number;
  InsuranceVatAmount: number;
  DiscountAmount: number;
  VatAmount: number;
  TotalPrice: number;
  ExtendedZoneAmount: number;
  EstimatedDeliveryDate: string;
  EstimatedDeliveryDays: number;
  OverWeightFrom: number;
  OverWeightPrice: number;
  BestOption: boolean;
  CityId: string | null;
  CityName: string | null;
  typeService: string;
  pickupInstructions: {
    icon: string;
    info: string;
    type: string;
    date: string;
  };
  deliveryInstructions: {
    icon: string;
    info: string;
    type: string;
    date: string;
  };
  labelInstructions: PakkeLabelInstructions[];
  serviceDescription: string[];
  OnboardingCosting: null;
  PromotionCosting: null;
  CourierScore: number;
  Kg: number;
  courierLogo: string;
}

export interface PakkeGetQuoteResponse {
  data: {
    Pakke: PakkeQuote[];
  };
}
