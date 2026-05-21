type LogLevel = "info" | "warn" | "error";

function toSerializableError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  return {
    message: typeof error === "string" ? error : "Unknown error",
  };
}

function writeLog(
  level: LogLevel,
  event: string,
  metadata?: Record<string, unknown>,
  error?: unknown,
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...(metadata ?? {}),
    ...(error ? { error: toSerializableError(error) } : {}),
  };

  const serialized = JSON.stringify(payload);

  switch (level) {
    case "warn":
      console.warn(serialized);
      return;
    case "error":
      console.error(serialized);
      return;
    default:
      console.info(serialized);
  }
}

export function logInfo(event: string, metadata?: Record<string, unknown>) {
  writeLog("info", event, metadata);
}

export function logWarn(event: string, metadata?: Record<string, unknown>) {
  writeLog("warn", event, metadata);
}

export function logError(
  event: string,
  error: unknown,
  metadata?: Record<string, unknown>,
) {
  writeLog("error", event, metadata, error);
}
