/**
 * Security event logger
 * Logs security-relevant events for monitoring
 */

type SecurityEventType =
  | "login_attempt"
  | "login_success"
  | "login_failure"
  | "rate_limited"
  | "prompt_injection_detected"
  | "invalid_input"
  | "unauthorized_access"
  | "payment_attempt";

interface SecurityEvent {
  type: SecurityEventType;
  details?: Record<string, unknown>;
  timestamp: string;
}

const MAX_LOG_SIZE = 200;
const securityLog: SecurityEvent[] = [];

export function logSecurityEvent(
  type: SecurityEventType,
  details?: Record<string, unknown>
): void {
  const event: SecurityEvent = {
    type,
    details: details ? { ...details } : undefined,
    timestamp: new Date().toISOString(),
  };

  // Console log for dev visibility
  if (type.includes("failure") || type.includes("injection") || type.includes("unauthorized")) {
    console.warn(`[SECURITY] ${type}`, details);
  }

  securityLog.push(event);
  if (securityLog.length > MAX_LOG_SIZE) {
    securityLog.splice(0, securityLog.length - MAX_LOG_SIZE);
  }
}

/** Get recent security events (for admin dashboard) */
export function getSecurityLog(): SecurityEvent[] {
  return [...securityLog];
}
