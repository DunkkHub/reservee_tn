export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function looksLikeEmailIdentifier(value: string) {
  return value.includes("@");
}

export function maskEmail(value: string) {
  const normalized = normalizeEmail(value);
  const [localPart, domainPart] = normalized.split("@");

  if (!localPart || !domainPart) {
    return normalized;
  }

  const visibleLocal =
    localPart.length <= 2
      ? `${localPart.charAt(0)}*`
      : `${localPart.slice(0, 2)}${"*".repeat(Math.max(localPart.length - 2, 1))}`;
  const [host, ...rest] = domainPart.split(".");
  const visibleHost =
    host.length <= 2
      ? `${host.charAt(0)}*`
      : `${host.slice(0, 2)}${"*".repeat(Math.max(host.length - 2, 1))}`;

  return `${visibleLocal}@${[visibleHost, ...rest].filter(Boolean).join(".")}`;
}

export function maskPhone(value: string) {
  const normalized = normalizePhone(value);

  if (!normalized) {
    return "";
  }

  if (normalized.length <= 4) {
    return normalized;
  }

  return `${"*".repeat(Math.max(normalized.length - 4, 2))}${normalized.slice(-4)}`;
}
