export interface GeneralResponse {
  version: string;
  data: unknown;
  message: string | null;
  error: string | object;
}
