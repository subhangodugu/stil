type LogLevel = "info" | "warn" | "error";

const format = (level: LogLevel, message: string, meta?: unknown) => {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] ${message} ${
    meta ? JSON.stringify(meta) : ""
  }`;
};

export const logger = {
  info: (msg: string, meta?: unknown) => {
    console.log(format("info", msg, meta));
  },
  warn: (msg: string, meta?: unknown) => {
    console.warn(format("warn", msg, meta));
  },
  error: (msg: string, meta?: unknown) => {
    console.error(format("error", msg, meta));
  }
};
