import "server-only";

import { env } from "@/lib/env";
import type { SmsProvider } from "@/lib/notifications/types";

export const twilioSmsProvider: SmsProvider = {
  name: "twilio",
  async send(input) {
    if (
      !env.TWILIO_ACCOUNT_SID ||
      !env.TWILIO_AUTH_TOKEN ||
      (!env.TWILIO_MESSAGING_SERVICE_SID && !env.TWILIO_FROM_PHONE)
    ) {
      throw new Error("Twilio is not configured.");
    }

    const formData = new URLSearchParams();
    formData.set("To", input.to);
    formData.set("Body", input.message.text);

    if (env.TWILIO_MESSAGING_SERVICE_SID) {
      formData.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
    } else if (env.TWILIO_FROM_PHONE) {
      formData.set("From", input.from ?? env.TWILIO_FROM_PHONE);
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`,
          ).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("Twilio rejected the notification request.");
    }
  },
};
