import { GeneralResponse, GlobalCreateGuideResponse } from '@/global.interface';

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

export interface PakkeExternalGetBasicGuideInfo {
  Content: string;
  CourierCode: string;
  CreatedAt: Date;
  DaysInTransit: number | null;
  DynamicConfig: {
    chargeOverweight: boolean;
    circularLogo: string;
    urlLogo: string;
    withoutBackgroundLogo: string;
    zplEnable: boolean;
  };
  ExpiresAt: Date;
  HasExceptions: number; // 0
  HasLost: number; // 0
  InsuredAmount: number; // 0
  IsMultiPackage: number; // 0
  LabelType: string; // "PDF"
  Name: string;
  RefundRequestDate: Date | null;
  ResellerReference: string; // "REF-1775701234567"
  ShipmentId: string;
  ShipmentParent: string | null; // null
  Status: string; // "SUCCESS"
  TrackingNumber: string;
  // Not using union type as I don't know if there are more statuses
  TrackingStatus: string; // 'WAITING' | 'DELIVERED' | 'ON_DELIVERY'
  WaybillNumber: string;
  Weight: number; // 25
  email: string;
}

export interface PakkeExternalGuideAddress {
  Country: string;
  ZipCode: string;
  State: string; // "MX-GUA"
  UserState: string; // "MX-GUA"
  City: string; // "León"
  Neighborhood: string; // "Centro"
  Address1: string;
  Address2: string;
  Residential: boolean;
  SaveAddress: boolean;
}

export interface PakkeExternalGuideTransaction {
  id: string;
  Date: Date;
  Type: string; // "Shipment Fee"
  TypeId: number; // 1
  MovementType: number;
  Amount: number;
  Status: number;
  ParentId: string | null;
  Refunded: boolean;
}

export interface PakkeExternalGetGuide {
  ShipmentId: string;
  ResellerId: string;
  OwnerId: string;
  OrderId: string | null;
  ResellerCourierServiceId: string | null;
  CreatedAt: Date;
  ExpiresAt: Date;
  TransitAt: string | null;
  DeliveredAt: string | null;
  CourierName: string; // "Estafeta"
  CourierCode: string; // "EDEQ_STF"
  CourierServiceId: string; // "ESTAFETA_TERRESTRE_CONSUMO_EDEQ"
  CostingPercentageAdjustment: number;
  CourierService: string; // "Terrestre Consumo"
  ResellerReference: string; // "REF-1775701234567"
  Status: string; // "SUCCESS"
  HasExceptions: boolean;
  HasLost: number;
  HasChangeZipCode: boolean;
  TrackingNumber: string;
  WaybillNumber: string;
  TrackingStatus: string; // 'WAITING' | 'DELIVERED' | 'ON_DELIVERY'
  SendRecipientNotifications: boolean;
  InsuredAmount: number;
  ShipmentDependencyId: string | null;
  PaternGuide: string | null;
  ShipmentType: number; // 0
  ReasonGuide: string | null;
  Parcel: {
    Height: number;
    Width: number;
    Length: number;
    Weight: number;
    VolumetricWeight: number;
  };
  QuotedWeight: number;
  RealWeight: number;
  RealOverWeight: number;
  CoveredWeight: number;
  OverWeight: number;
  OverWeightPrice: number;
  CoveredAmount: number;
  ExtrasAmount: number;
  QuotedAmount: number;
  QuoteExtraFee: number;
  OverWeightCounterAmount: number;
  CouponCode: string | null;
  InsurenceAmountSegureGroup: number;
  InsurancePercentFactor: number;
  ShipmentAmount: number;
  ShipmentSubtotalAmount: number;
  ShipmentVatAmount: number;
  InsuranceAmount: number;
  InsuranceVatAmount: number;
  ExtendedZoneAmount: number;
  DiscountAmount: number;
  TotalAmount: number;
  OriginalWeight: number;
  OriginalWidth: number;
  OriginalLength: number;
  OriginalHeight: number;
  OriginalVolumetricWeight: number;
  CourierWeight: number;
  CourierWidth: number;
  CourierLength: number;
  CourierHeight: number;
  CourierVolumetricWeight: number;
  AddressFrom: PakkeExternalGuideAddress;
  AddressTo: PakkeExternalGuideAddress;
  Sender: PkkRecipientCreateGuide;
  Recipient: PkkRecipientCreateGuide;
  ReceivedAt: Date | null;
  ReceivedBy: string | null;
  Owner: string;
  DaysInTransit: number | null;
  EnableRefund: number; // 1
  ChangeZipCode: string | null;
  Clarification: string | null;
  Content: string;
  transactions: PakkeExternalGuideTransaction[];
  transactionsPending: PakkeExternalGuideTransaction[];
  Credentials: string;
  TrackingNumberReplaced: string | null;
  TrackingNumberReplaces: string | null;
  Folio: string | null;
  EstimatedDeliveryDate: Date | null;
  Dependencies: unknown[]; // Don't know what type is this, came as an empty array in the responses
  isCustomCredentials: boolean;
  LabelType: string; // "PDF"
  NotValidConditions: boolean;
  IsMultiPackage: number;
  DispatchIndications: string | null;
}

export interface CreateGuidePkkDataResponse
  extends Omit<GeneralResponse, 'data' | 'error'> {
  error: null;
  messages: string[];
  data: {
    guide: GlobalCreateGuideResponse | null;
  };
}

export interface GetGuidePkkPayload {
  pageNumber?: number;
  pageSize?: number;
}
