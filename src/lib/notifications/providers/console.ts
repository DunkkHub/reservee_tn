import "server-only";

import { logInfo } from "@/lib/logger";
import type { EmailProvider, SmsProvider } from "@/lib/notifications/types";

export const consoleEmailProvider: EmailProvider = {
  name: "console",
  async send(input) {
    logInfo("notification.email.console", {
      to: input.to,
      subject: input.message.subject,
      purpose: input.message.purpose,
    });
  },
};

export const consoleSmsProvider: SmsProvider = {
  name: "console",
  async send(input) {
    logInfo("notification.sms.console", {
      to: input.to,
      subject: input.message.subject,
      purpose: input.message.purpose,
    });
  },
};
