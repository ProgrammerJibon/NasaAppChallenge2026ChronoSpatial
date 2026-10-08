type LogLevel = "debug" | "info" | "warn" | "error";

const levelWeights: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel = process.env.NODE_ENV === "test" ? "error" : "info";

function log(level: LogLevel, message: string, meta?: unknown) {
  if (levelWeights[level] < levelWeights[currentLevel]) return;
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    level,
    message,
    ...(meta && typeof meta === "object" ? { meta } : meta !== undefined ? { details: meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (msg: string, meta?: unknown) => log("debug", msg, meta),
  info: (msg: string, meta?: unknown) => log("info", msg, meta),
  warn: (msg: string, meta?: unknown) => log("warn", msg, meta),
  error: (msg: string, meta?: unknown) => log("error", msg, meta),
};
