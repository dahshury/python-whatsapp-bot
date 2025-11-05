export type ReservationToastPayload = {
  id?: string | number;
  customer?: string;
  wa_id?: string;
  date?: string;
  time?: string;
  isLocalized?: boolean;
};

export type MessageToastPayload = {
  title: string;
  description?: string;
  isLocalized?: boolean;
  wa_id?: string;
  waId?: string;
  date?: string;
  time?: string;
  message?: string;
  customerName?: string;
};
