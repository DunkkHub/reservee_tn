import "server-only";

import { env } from "@/lib/env";
import type { EmailProvider } from "@/lib/notifications/types";

export const resendEmailProvider: EmailProvider = {
  name: "resend",
  async send(input) {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      throw new Error("Resend is not configured.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: input.from ?? env.RESEND_FROM_EMAIL,
        to: [input.to],
        subject: input.message.subject,
        text: input.message.text,
        html: input.message.html ?? `<p>${input.message.text}</p>`,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Resend rejected the notification request.");
    }
  },
};
