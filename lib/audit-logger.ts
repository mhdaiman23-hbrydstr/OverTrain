/**
 * Audit Logger Service
 *
 * Logs critical user actions to database for security and compliance
 * Designed for Tier 1: Minimal logging to stay within free tier
 *
 * Actions logged:
 * - Authentication (signup, login, logout)
 * - Profile changes
 * - Program management (create, delete)
 * - Workout completion
 * - Admin actions
 *
 * Storage estimate: ~42 MB/month = FREE TIER ✅
 */

import { supabase } from "./supabase";

// Critical actions only (Tier 1)
const CRITICAL_ACTIONS = {
  "USER_SIGNUP": true,
  "USER_LOGIN": true,
  "USER_LOGOUT": true,
  "PROFILE_UPDATED": true,
  "PROGRAM_CREATED": true,
  "PROGRAM_DELETED": true,
  "WORKOUT_COMPLETED": true,
  "ADMIN_ACTION": true,
} as const;

type AuditAction = keyof typeof CRITICAL_ACTIONS;

interface AuditLogEvent {
  action: AuditAction;
  userId: string;
  resourceType?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log an audit event to the database
 *
 * Only logs if action is in CRITICAL_ACTIONS list
 * Prevents database bloat and unnecessary costs
 */
export async function logAuditEvent(event: AuditLogEvent) {
  try {
    // Only log critical actions
    if (!CRITICAL_ACTIONS[event.action]) {
      return; // Silently skip non-critical actions
    }

    // Don't log if user_id is missing
    if (!event.userId) {
      console.warn("[AuditLogger] No userId provided");
      return;
    }

    const { error } = await supabase.from("audit_logs").insert([
      {
        user_id: event.userId,
        action: event.action,
        resource_type: event.resourceType || null,
        resource_id: event.resourceId || null,
        details: event.details || null,
        ip_address: event.ipAddress || null,
        user_agent: event.userAgent?.substring(0, 500) || null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error("[AuditLogger] Failed to log event:", error);
      // Don't throw - don't let audit logging break the main operation
    }
  } catch (error) {
    console.error("[AuditLogger] Unexpected error:", error);
    // Silently fail - audit logging should never crash the app
  }
}

/**
 * Get audit logs for a specific user
 * Only for admin use
 */
export async function getAuditLogsForUser(userId: string, limit = 50) {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[AuditLogger] Failed to fetch logs:", error);
    return [];
  }
}

/**
 * Get audit logs by action type
 * Only for admin use
 */
export async function getAuditLogsByAction(action: AuditAction, limit = 50) {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("action", action)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[AuditLogger] Failed to fetch logs:", error);
    return [];
  }
}

/**
 * Get recent audit logs (last N days)
 * Only for admin use
 */
export async function getRecentAuditLogs(days = 7, limit = 100) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[AuditLogger] Failed to fetch logs:", error);
    return [];
  }
}

/**
 * MAINTENANCE: Clean up old audit logs
 *
 * Run this monthly to keep database size under control
 * Keeps logs for 90 days, deletes older ones
 *
 * Command:
 * await cleanupOldAuditLogs()
 */
export async function cleanupOldAuditLogs() {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error, count } = await supabase
      .from("audit_logs")
      .delete()
      .lt("created_at", ninetyDaysAgo.toISOString());

    if (error) throw error;

    console.log(`[AuditLogger] Cleaned up ${count} old audit logs`);
    return count;
  } catch (error) {
    console.error("[AuditLogger] Cleanup failed:", error);
    return 0;
  }
}

/**
 * Extract IP address from request
 */
export function getClientIP(request?: Request): string | null {
  if (!request) return null;

  // Try x-forwarded-for first (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  // Fallback to CF-Connecting-IP (Cloudflare)
  const cfIP = request.headers.get("cf-connecting-ip");
  if (cfIP) return cfIP;

  return null;
}

/**
 * Export audit logs as CSV (for compliance/admin review)
 */
export async function exportAuditLogsCSV(days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Convert to CSV
    const headers = [
      "ID",
      "User ID",
      "Action",
      "Resource Type",
      "Resource ID",
      "Details",
      "IP Address",
      "User Agent",
      "Timestamp",
    ];

    const rows = data.map((log: any) => [
      log.id,
      log.user_id,
      log.action,
      log.resource_type || "",
      log.resource_id || "",
      JSON.stringify(log.details || {}),
      log.ip_address || "",
      log.user_agent || "",
      new Date(log.created_at).toISOString(),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) =>
            typeof cell === "string" && cell.includes(",")
              ? `"${cell.replace(/"/g, '""')}"`
              : cell
          )
          .join(",")
      ),
    ].join("\n");

    return csv;
  } catch (error) {
    console.error("[AuditLogger] Export failed:", error);
    return null;
  }
}
