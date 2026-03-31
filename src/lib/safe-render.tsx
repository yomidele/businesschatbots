/**
 * LAYER D: UI / DASHBOARD LAYER - SAFE STATE GUARDS
 * 
 * ✅ RULE: Never render undefined/null data without checks
 * ✅ Prevents blank page crashes
 * ✅ Proper loading states in all components
 */

import React from "react";

/**
 * Safe message renderer - prevents crash if messages array is undefined
 */
export interface SafeMessage {
  role: "user" | "assistant";
  content: string;
}

export function renderSafeMessages(
  messages: SafeMessage[] | undefined | null,
  renderFn: (msg: SafeMessage, index: number) => React.ReactNode
) {
  if (!messages || messages.length === 0) {
    return null;
  }

  return messages.map((msg, i) => {
    if (!msg || !msg.content) {
      console.warn(`Invalid message at index ${i}:`, msg);
      return null;
    }
    return renderFn(msg, i);
  });
}

/**
 * Safe data wrapper - handles loading, error, success states
 */
export function SafeDataWrapper({
  isLoading,
  error,
  data,
  children,
  loadingFallback = <div>Loading...</div>,
  errorFallback = <div>Error loading data</div>,
  emptyFallback = <div>No data available</div>,
}: {
  isLoading: boolean;
  error: Error | null;
  data: any;
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  emptyFallback?: React.ReactNode;
}) {
  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  if (error) {
    console.error("Data error:", error);
    return <>{errorFallback}</>;
  }

  if (!data) {
    return <>{emptyFallback}</>;
  }

  return <>{children}</>;
}

/**
 * Safe optional data access
 */
export function safeGet<T>(obj: any, path: string, defaultValue?: T): T | undefined {
  try {
    const result = path.split(".").reduce((curr, prop) => curr?.[prop], obj);
    return result ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Validate required fields exist before rendering
 */
export function validateRequiredFields(
  data: any,
  fields: string[]
): { valid: boolean; missingFields: string[] } {
  const missingFields = fields.filter((field) => {
    const value = safeGet(data, field);
    return value === null || value === undefined || value === "";
  });

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Safe component wrapper for error boundaries
 */
export function SafeComponent({
  children,
  fallback = <div>Error rendering component</div>,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  try {
    return <>{children}</>;
  } catch (error) {
    console.error("Component error:", error);
    return <>{fallback}</>;
  }
}
