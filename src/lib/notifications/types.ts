export type NotificationPurpose =
  | "booking_created"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_reminder"
  | "business_alert"
  | "admin_alert";

export interface NotificationMessage {
  purpose: NotificationPurpose;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  name: string;
  send(input: {
    to: string;
    from?: string;
    message: NotificationMessage;
  }): Promise<void>;
}

export interface SmsProvider {
  name: string;
  send(input: {
    to: string;
    from?: string;
    message: NotificationMessage;
  }): Promise<void>;
}
