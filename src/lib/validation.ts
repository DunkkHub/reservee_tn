export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[+]?[\d\s\-()]{10,}$/;
  return phoneRegex.test(phone);
}

export function validatePassword(password: string): ValidationResult {
  const errors: ValidationError[] = [];

  if (password.length < 8) {
    errors.push({
      field: "password",
      message: "Password must be at least 8 characters long",
    });
  }

  if (!/[A-Z]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one uppercase letter",
    });
  }

  if (!/[a-z]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one lowercase letter",
    });
  }

  if (!/[0-9]/.test(password)) {
    errors.push({
      field: "password",
      message: "Password must contain at least one number",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateServiceInput(input: {
  title?: string;
  price?: number;
  durationMinutes?: number;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.title?.trim()) {
    errors.push({
      field: "title",
      message: "Service title is required",
    });
  } else if (input.title.length > 120) {
    errors.push({
      field: "title",
      message: "Service title must be 120 characters or less",
    });
  }

  if (input.price === undefined || input.price === null) {
    errors.push({
      field: "price",
      message: "Price is required",
    });
  } else if (input.price < 0) {
    errors.push({
      field: "price",
      message: "Price must be a positive number",
    });
  }

  if (input.durationMinutes === undefined || input.durationMinutes === null) {
    errors.push({
      field: "durationMinutes",
      message: "Duration is required",
    });
  } else if (input.durationMinutes < 5) {
    errors.push({
      field: "durationMinutes",
      message: "Duration must be at least 5 minutes",
    });
  } else if (input.durationMinutes > 480) {
    errors.push({
      field: "durationMinutes",
      message: "Duration must be 480 minutes or less",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBookingInput(input: {
  customerName?: string;
  customerPhone?: string;
  startAt?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.customerName?.trim()) {
    errors.push({
      field: "customerName",
      message: "Customer name is required",
    });
  } else if (input.customerName.length > 120) {
    errors.push({
      field: "customerName",
      message: "Customer name must be 120 characters or less",
    });
  }

  if (!input.customerPhone?.trim()) {
    errors.push({
      field: "customerPhone",
      message: "Customer phone is required",
    });
  } else if (!validatePhone(input.customerPhone)) {
    errors.push({
      field: "customerPhone",
      message: "Invalid phone number format",
    });
  }

  if (!input.startAt) {
    errors.push({
      field: "startAt",
      message: "Start time is required",
    });
  }

  if (input.startAt) {
    const start = new Date(input.startAt);
    if (start < new Date()) {
      errors.push({
        field: "startAt",
        message: "Start time cannot be in the past",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateBusinessProfileInput(input: {
  businessName?: string;
  address?: string;
  phone?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!input.businessName?.trim()) {
    errors.push({
      field: "businessName",
      message: "Business name is required",
    });
  } else if (input.businessName.length > 160) {
    errors.push({
      field: "businessName",
      message: "Business name must be 160 characters or less",
    });
  }

  if (!input.address?.trim()) {
    errors.push({
      field: "address",
      message: "Address is required",
    });
  } else if (input.address.length > 190) {
    errors.push({
      field: "address",
      message: "Address must be 190 characters or less",
    });
  }

  if (!input.phone?.trim()) {
    errors.push({
      field: "phone",
      message: "Phone is required",
    });
  } else if (!validatePhone(input.phone)) {
    errors.push({
      field: "phone",
      message: "Invalid phone number format",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
