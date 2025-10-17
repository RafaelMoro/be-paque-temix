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
    isResidential: boolean;
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
    isResidential: boolean;
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

export interface PkkSenderCreateGuide {
  Name: string;
  Email?: string;
  Phone1?: string;
  Phone2?: string;
  // This field is not mandatory only for sender
  CompanyName?: string;
}

export interface PkkRecipientCreateGuide {
  Name: string;
  Email?: string;
  Phone1?: string;
  Phone2?: string;
  // This field is mandatory only for recipient
  CompanyName: string;
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
  Sender: PkkSenderCreateGuide;
  Recipient: PkkRecipientCreateGuide;
}

export interface PakkeExternalCreateGuideResponse {
  ShipmentId: string;
  ResellerId: string;
  OwnerId: string;
  CreatedAt: Date;
  ExpiresAt: Date;
  CourierName: string;
  CourierCode: string;
  CourierServiceId: string;
  CourierService: string;
  // Personalized reference of the package
  ResellerReference: string;
  // Flag to determine if the deliveryt has exceptions
  HasExceptions: boolean;
  // Flag to know if the delivery address postal code has changed
  HasChangeZipCode: boolean;
  // Flag to know if the guide has enabled the sending of notifications
  SendRecipientNotifications: boolean;
  InsuredAmount: number;
  Parcel: {
    Length: number;
    Width: number;
    Height: number;
    Weight: number;
  };
  AddressFrom: PkkAddressCreateGuide;
  AddressTo: PkkAddressCreateGuide;
  Sender: PkkSenderCreateGuide;
  Recipient: PkkRecipientCreateGuide;
  QuotedAmount: number;
  DiscountAmount: number;
  InsuranceAmount: number;
  TotalAmount: number;
  OverWeightPrice: number;
  OriginalWeight: number;
  OriginalWidth: number;
  OriginalLength: number;
  OriginalHeight: number;
  OriginalVolumetricWeight: number;
  RealWeight: number;
  RealOverWeight: number;
  Owner: string;
  DaysInTransit: number;
  Content: string;
  Status: 'SUCCESS' | 'REFUNDED' | 'REFUNDPENDING' | 'REFUNDFAILED';
  TrackingNumber: string;
  TrackingStatus:
    | 'WAITING '
    | 'IN_TRANSIT'
    | 'ON_DELIVERY'
    | 'DELIVERED'
    | 'RETURNED'
    | 'CANCELLED'
    | 'EXCEPTION';
  Label: string;
}
