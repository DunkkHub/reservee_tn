import "server-only";

import { env } from "@/lib/env";
import { logError, logInfo } from "@/lib/logger";
import { consoleEmailProvider, consoleSmsProvider } from "@/lib/notifications/providers/console";
import { resendEmailProvider } from "@/lib/notifications/providers/resend";
import { twilioSmsProvider } from "@/lib/notifications/providers/twilio";
import type {
  EmailProvider,
  NotificationMessage,
  SmsProvider,
} from "@/lib/notifications/types";

function getEmailProvider(): EmailProvider {
  return env.NOTIFICATION_EMAIL_PROVIDER === "resend"
    ? resendEmailProvider
    : consoleEmailProvider;
}

function getSmsProvider(): SmsProvider {
  return env.NOTIFICATION_SMS_PROVIDER === "twilio"
    ? twilioSmsProvider
    : consoleSmsProvider;
}

export async function sendNotification(input: {
  channel: "email" | "sms";
  to: string;
  message: NotificationMessage;
}) {
  const provider = input.channel === "email" ? getEmailProvider() : getSmsProvider();

  await provider.send({
    to: input.to,
    message: input.message,
  });

  logInfo("notification.sent", {
    channel: input.channel,
    provider: provider.name,
    purpose: input.message.purpose,
  });
}

export async function sendNotificationSafely(input: {
  channel: "email" | "sms";
  to: string | null | undefined;
  message: NotificationMessage;
}) {
  if (!input.to?.trim()) {
    return false;
  }

  try {
    await sendNotification({
      channel: input.channel,
      to: input.to,
      message: input.message,
    });
    return true;
  } catch (error) {
    logError("notification.failed", error, {
      channel: input.channel,
      purpose: input.message.purpose,
    });
    return false;
  }
}
