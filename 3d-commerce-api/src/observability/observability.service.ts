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

      const envelopeHeader = JSON.stringify({
        event_id: payload.event_id,
        sent_at: new Date().toISOString(),
      });
      const itemHeader = JSON.stringify({
        type: "event",
        length: Buffer.byteLength(JSON.stringify(payload)),
      });
      const envelope = `${envelopeHeader}\n${itemHeader}\n${JSON.stringify(payload)}`;

      await fetch(`${url.protocol}//${url.host}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(publicKey)}`, {
        method: "POST",
        headers: { "content-type": "application/x-sentry-envelope" },
        body: envelope,
      });
    } catch (sendError) {
      this.logger.warn(JSON.stringify({
        type: "observability_error",
        message: sendError instanceof Error ? sendError.message : String(sendError),
      }));
    }
  }
}
