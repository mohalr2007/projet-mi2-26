import { supabase } from "@/utils/supabase/client";

type AuditPayload = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

type PerfPayload = {
  actorId?: string | null;
  pageKey: string;
  metricName: string;
  metricMs: number;
  context?: Record<string, unknown>;
};

export async function logAuditEvent(payload: AuditPayload) {
  try {
    const { error } = await supabase.from("system_audit_logs").insert({
      actor_id: payload.actorId ?? null,
      action: payload.action,
      entity_type: payload.entityType,
      entity_id: payload.entityId ?? null,
      metadata: payload.metadata ?? {},
    });

    if (error) {
      console.warn("Audit log insert failed:", error.message);
    }
  } catch (error) {
    console.warn("Audit log insert exception:", error);
  }
}

export async function logPerformanceEvent(payload: PerfPayload) {
  try {
    const metricValue = Number.isFinite(payload.metricMs) ? Math.max(0, payload.metricMs) : 0;
    const { error } = await supabase.from("performance_events").insert({
      actor_id: payload.actorId ?? null,
      page_key: payload.pageKey,
      metric_name: payload.metricName,
      metric_ms: Number(metricValue.toFixed(2)),
      context: payload.context ?? {},
    });

    if (error) {
      console.warn("Performance event insert failed:", error.message);
    }
  } catch (error) {
    console.warn("Performance event insert exception:", error);
  }
}
