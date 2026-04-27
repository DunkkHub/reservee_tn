import "server-only";

import { maskEmail, maskPhone } from "@/lib/contact-utils";

export type VerificationDeliveryChannel = "sms" | "email";
export type VerificationPurpose = "login" | "password_reset" | "booking_access";

type DeliveryTransport = "twilio" | "resend" | "preview";

type DeliveryResult = {
  deliveryChannel: VerificationDeliveryChannel;
  destinationHint: string;
  developmentCodePreview: string | null;
  transport: DeliveryTransport;
};

function canUsePreviewDelivery() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.VERIFICATION_CODE_DEV_PREVIEW === "true" ||
    process.env.BOOKING_OTP_DEV_PREVIEW === "true"
  );
}

function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!accountSid || !authToken || (!messagingServiceSid && !fromPhone)) {
    return null;
  }

  return {
    accountSid,
    authToken,
    messagingServiceSid,
    fromPhone,
  };
}

function getResendConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    return null;
  }

  return {
    apiKey,
    fromEmail,
  };
}

function getPurposeCopy(purpose: VerificationPurpose) {
  switch (purpose) {
    case "password_reset":
      return {
        sms: "Your Reservee password reset code is",
        emailSubject: "Reset your Reservee password",
        emailIntro: "Use this code to reset your Reservee password:",
      };
    case "booking_access":
      return {
        sms: "Your Reservee booking verification code is",
        emailSubject: "Verify your Reservee booking",
        emailIntro: "Use this code to verify your Reservee booking:",
      };
    case "login":
    default:
      return {
        sms: "Your Reservee login verification code is",
        emailSubject: "Your Reservee login code",
        emailIntro: "Use this code to finish signing in to Reservee:",
      };
  }
}

async function sendSmsWithTwilio(input: { to: string; body: string }) {
  const config = getTwilioConfig();

  if (!config) {
    throw new Error("SMS delivery is not configured yet.");
  }

  const formData = new URLSearchParams();
  formData.set("To", input.to);
  formData.set("Body", input.body);

  if (config.messagingServiceSid) {
    formData.set("MessagingServiceSid", config.messagingServiceSid);
  } else if (config.fromPhone) {
    formData.set("From", config.fromPhone);
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.accountSid}:${config.authToken}`,
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const payload = (await response.text()) || "Twilio rejected the SMS request.";
    throw new Error(payload);
  }
}

async function sendEmailWithResend(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  const config = getResendConfig();

  if (!config) {
    throw new Error("Email delivery is not configured yet.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: config.fromEmail,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.text()) || "Resend rejected the email request.";
    throw new Error(payload);
  }
}

export async function deliverVerificationCode(input: {
  deliveryChannel: VerificationDeliveryChannel;
  destination: string;
  code: string;
  purpose: VerificationPurpose;
}) {
  const copy = getPurposeCopy(input.purpose);

  if (input.deliveryChannel === "sms") {
    const destinationHint = maskPhone(input.destination);
    const body = `${copy.sms} ${input.code}. It expires in 5 minutes.`;
    const twilioConfig = getTwilioConfig();

    if (twilioConfig) {
      await sendSmsWithTwilio({
        to: input.destination,
        body,
      });

      return {
        deliveryChannel: input.deliveryChannel,
        destinationHint,
        developmentCodePreview: null,
        transport: "twilio",
      } satisfies DeliveryResult;
    }

    if (!canUsePreviewDelivery()) {
      throw new Error("SMS delivery is not configured yet.");
    }

    console.info(
      `[verification-preview:sms] ${input.purpose} -> ${destinationHint}: ${input.code}`,
    );

    return {
      deliveryChannel: input.deliveryChannel,
      destinationHint,
      developmentCodePreview: input.code,
      transport: "preview",
    } satisfies DeliveryResult;
  }

  const destinationHint = maskEmail(input.destination);
  const resendConfig = getResendConfig();
  const subject = copy.emailSubject;
  const text = `${copy.emailIntro} ${input.code}. It expires in 5 minutes.`;
  const html = `<p>${copy.emailIntro}</p><p style="font-size:24px;font-weight:700;letter-spacing:0.18em;">${input.code}</p><p>This code expires in 5 minutes.</p>`;

  if (resendConfig) {
    await sendEmailWithResend({
      to: input.destination,
      subject,
      text,
      html,
    });

    return {
      deliveryChannel: input.deliveryChannel,
      destinationHint,
      developmentCodePreview: null,
      transport: "resend",
    } satisfies DeliveryResult;
  }

  if (!canUsePreviewDelivery()) {
    throw new Error("Email delivery is not configured yet.");
  }

  console.info(
    `[verification-preview:email] ${input.purpose} -> ${destinationHint}: ${input.code}`,
  );

  return {
    deliveryChannel: input.deliveryChannel,
    destinationHint,
    developmentCodePreview: input.code,
    transport: "preview",
  } satisfies DeliveryResult;
}

export function formatVerificationDeliveryMessage(input: {
  purpose: VerificationPurpose;
  result: DeliveryResult;
}) {
  const channelLabel = input.result.deliveryChannel === "sms" ? "SMS" : "email";
  const actionLabel =
    input.result.transport === "preview" ? "generated" : "sent";
  const purposeLabel =
    input.purpose === "password_reset"
      ? "password reset"
      : input.purpose === "booking_access"
        ? "booking verification"
        : "login verification";
  let message = `The ${purposeLabel} code was ${actionLabel} via ${channelLabel} to ${input.result.destinationHint}.`;

  if (input.result.developmentCodePreview) {
    message = `${message} Dev preview: ${input.result.developmentCodePreview}.`;
  }

  return message;
}
