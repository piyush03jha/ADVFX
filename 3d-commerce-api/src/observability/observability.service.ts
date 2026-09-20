import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";

@Injectable()
export class ObservabilityService {
  private readonly logger = new Logger("Observability");
  private readonly dsn = process.env.SENTRY_DSN ?? "";

  async captureException(error: unknown, context: Record<string, unknown> = {}) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error(JSON.stringify({ type: "exception", message: err.message, ...context }));
    await this.send("error", err.message, err.stack, context);
  }

  async captureMessage(message: string, context: Record<string, unknown> = {}) {
    this.logger.warn(JSON.stringify({ type: "alert", message, ...context }));
    await this.send("warning", message, undefined, context);
  }

  private async send(level: string, message: string, stack?: string, context: Record<string, unknown> = {}) {
    if (!this.dsn) return;
    try {
      const url = new URL(this.dsn);
      const projectId = url.pathname.replace(/^\//, "");
      const publicKey = url.username;
      if (!projectId || !publicKey) return;

      const payload = {
        event_id: randomUUID().replace(/-/g, ""),
        timestamp: Date.now() / 1000,
        platform: "node",
        level,
        message,
        exception: stack ? { values: [{ type: "Error", value: message, stacktrace: { frames: [{ filename: "advfx-api", function: "runtime", lineno: 1, colno: 1 }] } }] } : undefined,
        extra: context,
        environment: process.env.NODE_ENV,
        server_name: "advfx-api",
      };

      await fetch(`${url.protocol}//${url.host}/api/${projectId}/store/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (sendError) {
      this.logger.warn(JSON.stringify({
        type: "observability_error",
        message: sendError instanceof Error ? sendError.message : String(sendError),
      }));
    }
  }
}
