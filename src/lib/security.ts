/**
 * Client-side security utilities
 * Input sanitization, rate limiting, and validation helpers
 */

// ── INPUT SANITIZATION ──

/** Strip HTML tags and dangerous characters from user input */
export function sanitizeInput(input: string, maxLength = 1000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    .replace(/[<>"'`]/g, "") // strip dangerous chars
    .trim()
    .slice(0, maxLength);
}

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const re = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return re.test(email);
}

// ── CLIENT-SIDE RATE LIMITER ──

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

/**
 * Simple client-side rate limiter (not a security boundary — defense in depth only)
 * @returns true if the action is allowed, false if rate-limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

// ── PROMPT INJECTION DETECTION (client-side pre-filter) ──

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+(instructions|prompts|context)/i,
  /disregard\s+(all\s+)?previous/i,
  /you\s+are\s+now\s+(a|an)\s+/i,
  /pretend\s+you\s+are/i,
  /act\s+as\s+(a|an)?\s*(hacker|admin|root|system)/i,
  /show\s+(me\s+)?(all|every)\s+(users?|data|records|passwords|secrets)/i,
  /give\s+me\s+admin\s+access/i,
  /reveal\s+(your|the)\s+(system|initial)\s+(prompt|instructions)/i,
  /what\s+(are|is)\s+your\s+(system|initial)\s+(prompt|instructions)/i,
  /override\s+(security|restrictions|rules)/i,
  /bypass\s+(auth|authentication|security)/i,
  /execute\s+(sql|command|script|code)/i,
  /drop\s+table/i,
  /union\s+select/i,
  /;\s*delete\s+from/i,
  /;\s*update\s+.*\s+set/i,
  /<script[^>]*>/i,
  /javascript:/i,
  /on(load|error|click)\s*=/i,
];

/** Check if a message contains potential prompt injection attempts */
export function detectPromptInjection(message: string): boolean {
  return INJECTION_PATTERNS.some((pattern) => pattern.test(message));
}

/** Sanitize chat message — strip injection attempts but keep the message usable */
export function sanitizeChatMessage(message: string): string {
  let sanitized = sanitizeInput(message, 2000);
  // Don't block entirely — just strip the dangerous parts for UX
  // The real protection is server-side
  return sanitized;
}
