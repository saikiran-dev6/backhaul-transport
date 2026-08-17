import { db } from "./db";

export async function logSecurityAudit(event: string, options?: { userId?: string; ipAddress?: string; userAgent?: string; metadata?: Record<string, unknown> }) {
  try {
    await db.securityAuditEvent.create({
      data: {
        event,
        userId: options?.userId || null,
        ipAddress: options?.ipAddress || null,
        userAgent: options?.userAgent || null,
        metadata: options?.metadata ? (options.metadata as any) : undefined,
      },
    });
  } catch (error) {
    console.error("[SecurityAuditLog] Failed to log event:", event, error);
  }
}
