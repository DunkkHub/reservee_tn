import { z, type ZodError, type ZodType } from "zod";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const phonePattern = /^[+]?[\d\s\-()]{8,20}$/;
const timePattern = /^\d{2}:\d{2}$/;
const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .email("Enter a valid email address.");

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required.")
  .regex(phonePattern, "Enter a valid phone number.");

export const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters long.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character.");

export const isoDateTimeSchema = z
  .string()
  .regex(isoDateTimePattern, "Use an ISO UTC datetime.")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: "Enter a valid date and time.",
  });

export const bookingStatusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled_by_customer",
  "cancelled_by_business",
  "completed",
  "no_show",
  "expired",
]);

export const businessStatusSchema = z.enum([
  "draft",
  "pending_review",
  "changes_requested",
  "approved",
  "featured",
  "suspended",
  "archived",
]);

export const audienceSchema = z.enum(["women", "men", "unisex"]);
export const bookingModeSchema = z.enum(["instant", "approval_required"]);
export const operatingModeSchema = z.enum(["appointment_only", "walk_ins", "both"]);
export const policyClaritySchema = z.enum(["clear", "needs_review"]);
export const mediaTypeSchema = z.enum(["cover", "gallery"]);

export const loginRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone number is required."),
  password: z.string().min(1, "Password is required."),
  deliveryChannel: z.enum(["sms", "email"]).optional(),
});

export const loginVerifyRequestSchema = z.object({
  challengeId: z.string().trim().min(1, "Challenge ID is required."),
  code: z.string().trim().length(6, "Verification code must be 6 digits."),
});

export const passwordResetRequestSchema = z.object({
  identifier: z.string().trim().min(1, "Email or phone number is required."),
  deliveryChannel: z.enum(["sms", "email"]).optional(),
});

export const passwordResetConfirmRequestSchema = z.object({
  challengeId: z.string().trim().min(1, "Challenge ID is required."),
  code: z.string().trim().length(6, "Verification code must be 6 digits."),
  password: passwordSchema,
});

export const registerRequestSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("customer"),
    name: z.string().trim().min(2, "Name is required.").max(120),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
  }),
  z.object({
    role: z.literal("shop"),
    name: z.string().trim().min(2, "Owner name is required.").max(120),
    email: emailSchema,
    phone: phoneSchema,
    password: passwordSchema,
    businessName: z.string().trim().min(2, "Business name is required.").max(160),
    categorySlug: z.enum([
      "barbers",
      "hair-salons",
      "beauty-centers",
      "nail-studios",
      "spas",
    ]),
    citySlug: z.string().trim().min(1, "City is required.").max(80),
    area: z.string().trim().min(1, "Area is required.").max(120),
  }),
]);

export const bookingCreateSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  serviceId: z.string().trim().min(1, "Service ID is required."),
  customerName: z.string().trim().min(2, "Customer name is required.").max(120),
  customerPhone: phoneSchema,
  customerNote: z.string().trim().max(500).optional().or(z.literal("")),
  startAt: isoDateTimeSchema,
  source: z.enum(["web", "dashboard"]).optional(),
});

export const bookingStatusUpdateSchema = z.object({
  action: z.enum(["updateStatus", "requestReschedule"]),
  status: bookingStatusSchema.optional(),
});

export const bookingReferenceChallengeSchema = z.object({
  customerPhone: phoneSchema,
});

export const bookingReferenceVerifySchema = z.object({
  challengeId: z.string().trim().min(1, "Challenge ID is required."),
  code: z.string().trim().length(6, "Verification code must be 6 digits."),
});

export const serviceCreateSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  title: z.string().trim().min(1, "Service title is required.").max(120),
  description: z.string().trim().max(600).optional().default(""),
  price: z.number().finite().nonnegative("Price must be a positive number."),
  durationMinutes: z
    .number()
    .int()
    .min(5, "Duration must be at least 5 minutes.")
    .max(480, "Duration must be 480 minutes or less."),
  genderTarget: audienceSchema.optional(),
});

export const serviceUpdateSchema = z.object({
  serviceId: z.string().trim().min(1, "Service ID is required."),
  businessId: z.string().trim().optional(),
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(600).optional(),
  price: z.number().finite().nonnegative().optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
  genderTarget: audienceSchema.optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  actionType: z.enum(["toggle", "duplicate", "move"]).optional(),
  direction: z.enum(["up", "down"]).optional(),
});

export const breakWindowSchema = z
  .object({
    start: z.string().regex(timePattern, "Break start must use HH:mm format."),
    end: z.string().regex(timePattern, "Break end must use HH:mm format."),
  })
  .refine((value) => value.start < value.end, {
    message: "Break end must be after break start.",
    path: ["end"],
  });

export const availabilityHoursSchema = z
  .object({
    businessId: z.string().trim().min(1, "Business ID is required."),
    type: z.literal("hours"),
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string().regex(timePattern, "Opening time must use HH:mm format.").optional(),
    closeTime: z.string().regex(timePattern, "Closing time must use HH:mm format.").optional(),
    isClosed: z.boolean().optional(),
    breaks: z.array(breakWindowSchema).optional(),
  })
  .refine(
    (value) =>
      value.isClosed === true ||
      (!value.isClosed && Boolean(value.openTime) && Boolean(value.closeTime)),
    {
      message: "Open and close times are required when the day is not closed.",
      path: ["openTime"],
    },
  )
  .refine(
    (value) =>
      value.isClosed === true ||
      !value.openTime ||
      !value.closeTime ||
      value.openTime < value.closeTime,
    {
      message: "Closing time must be after opening time.",
      path: ["closeTime"],
    },
  );

export const availabilityBlockedSchema = z
  .object({
    businessId: z.string().trim().min(1, "Business ID is required."),
    type: z.literal("blocked"),
    startAt: isoDateTimeSchema,
    endAt: isoDateTimeSchema,
    reason: z.string().trim().max(240).optional().default(""),
  })
  .refine((value) => new Date(value.startAt).getTime() < new Date(value.endAt).getTime(), {
    message: "Blocked slot end time must be after start time.",
    path: ["endAt"],
  });

export const mediaCreateSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  url: z.string().trim().url("Image URL must be valid."),
  alt: z.string().trim().max(160).default(""),
  type: mediaTypeSchema.optional(),
  storageProvider: z
    .enum(["local", "external_url", "s3", "r2", "cloudinary"])
    .optional(),
  storageKey: z.string().trim().max(255).nullable().optional(),
  mimeType: z.string().trim().max(120).nullable().optional(),
  fileSizeBytes: z.number().int().positive().nullable().optional(),
});

export const mediaUpdateSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  mediaId: z.string().trim().min(1, "Media ID is required."),
  actionType: z.enum(["move", "setCover"]),
  direction: z.enum(["up", "down"]).optional(),
});

export const waitlistCreateSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  serviceId: z.string().trim().min(1, "Service ID is required."),
  customerName: z.string().trim().min(2, "Customer name is required.").max(120),
  customerPhone: phoneSchema,
  preferredDate: z.string().trim().min(1, "Preferred date is required."),
  preferredTime: z.string().trim().min(1, "Preferred time is required."),
  note: z.string().trim().max(500).optional(),
});

export const adminBusinessModerationSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  status: businessStatusSchema,
  featuredUntil: isoDateTimeSchema.nullable().optional(),
  featuredRank: z.number().int().positive().nullable().optional(),
  internalNote: z.string().trim().max(500).optional(),
  businessMessage: z.string().trim().max(500).optional(),
});

export const businessUpdateSchema = z.object({
  businessId: z.string().trim().min(1, "Business ID is required."),
  name: z.string().trim().min(2).max(160).optional(),
  area: z.string().trim().min(1).max(120).optional(),
  address: z.string().trim().min(4).max(190).optional(),
  phone: phoneSchema.optional(),
  whatsapp: phoneSchema.optional(),
  instagram: z.string().trim().max(120).optional(),
  tagline: z.string().trim().max(180).optional(),
  description: z.string().trim().max(2000).optional(),
  logoText: z.string().trim().max(12).optional(),
  coverUrl: z.string().trim().url().optional(),
  audience: audienceSchema.optional(),
  yearsInBusiness: z.number().int().min(0).max(100).optional(),
  responseWindow: z.string().trim().max(120).optional(),
  bookingMode: bookingModeSchema.optional(),
  operatingMode: operatingModeSchema.optional(),
  status: businessStatusSchema.optional(),
  trust: z
    .object({
      phoneVerified: z.boolean().optional(),
      addressVerified: z.boolean().optional(),
      responseTimeTracked: z.boolean().optional(),
    })
    .optional(),
  policies: z
    .object({
      cancellationNotice: z.string().trim().max(500).optional(),
      lateArrivalGraceMinutes: z.number().int().min(0).max(180).optional(),
      noShowRule: z.string().trim().max(500).optional(),
      hygieneNote: z.string().trim().max(500).optional(),
      depositRequired: z.boolean().optional(),
      childrenAccepted: z.boolean().optional(),
      policyClarity: policyClaritySchema.optional(),
    })
    .optional(),
});

export function toValidationErrors(error: ZodError | ValidationError[]) {
  if (Array.isArray(error)) {
    return error;
  }

  return error.issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));
}

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

export function validatePassword(password: string): ValidationResult {
  const parsed = passwordSchema.safeParse(password);
  return {
    valid: parsed.success,
    errors: parsed.success ? [] : toValidationErrors(parsed.error),
  };
}

export function validateServiceInput(input: {
  title?: string;
  price?: number;
  durationMinutes?: number;
}): ValidationResult {
  const parsed = serviceCreateSchema
    .pick({ title: true, price: true, durationMinutes: true })
    .safeParse(input);

  return {
    valid: parsed.success,
    errors: parsed.success ? [] : toValidationErrors(parsed.error),
  };
}

export function validateBookingInput(input: {
  customerName?: string;
  customerPhone?: string;
  startAt?: string;
}): ValidationResult {
  const parsed = bookingCreateSchema
    .pick({ customerName: true, customerPhone: true, startAt: true })
    .safeParse(input);

  return {
    valid: parsed.success,
    errors: parsed.success ? [] : toValidationErrors(parsed.error),
  };
}

export function validateBusinessProfileInput(input: {
  businessName?: string;
  address?: string;
  phone?: string;
}): ValidationResult {
  const schema = z.object({
    businessName: z.string().trim().min(2).max(160),
    address: z.string().trim().min(4).max(190),
    phone: phoneSchema,
  });
  const parsed = schema.safeParse(input);

  return {
    valid: parsed.success,
    errors: parsed.success ? [] : toValidationErrors(parsed.error),
  };
}

export function safeParseWithSchema<T>(
  schema: ZodType<T>,
  input: unknown,
) {
  return schema.safeParse(input);
}
