export type PakkeCourier =
  | 'Estafeta'
  | 'AMPM'
  | 'DHL'
  | 'FedEx'
  | 'Paquete Express'
  | 'Tres Guerras Logistics';

export interface PakkeLabelInstructions {
  label: string;
  icon: string;
}

export interface PakkeQuote {
  CourierCode: string;
  CourierName: PakkeCourier;
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
  Pakke: PakkeQuote[];
}

export interface PkkCreateGuideRequest {
  parcel: {
    content: string;
    length: string;
    width: string;
    height: string;
    weight: string;
  };
  origin: {
    name: string;
    email: string;
    phone: string;
    company?: string;
    street1: string;
    // equivalent to reference
    street2?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  };
  destination: {
    name: string;
    email: string;
    phone: string;
    company: string;
    street1: string;
    // equivalent to reference
    street2?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

export interface PkkAddressCreateGuide {
  ZipCode: string;
  State: string;
  City: string;
  Neighborhood: string;
  // Street name and number
  Address1: string;
  // For additional data of the address
  Address2: string;
  Residential: boolean;
}

export interface PkkExternalCreateGuideRequest {
  AddressFrom: PkkAddressCreateGuide;
  AddressTo: PkkAddressCreateGuide;
  Content: string;
  Parcel: {
    Length: number;
    Width: number;
    Height: number;
    Weight: number;
  };
  Sender: {
    Name: string;
    Email?: string;
    Phone1?: string;
    Phone2?: string;
    // This field is not mandatory only for sender
    CompanyName?: string;
  };
  Recipient: {
    Name: string;
    Email?: string;
    Phone1?: string;
    Phone2?: string;
    // This field is mandatory only for recipient
    CompanyName: string;
  };
}
