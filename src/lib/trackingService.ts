import { supabase } from "@/integrations/supabase/client";

// ══════════════════════════════════════════════════════════════════════════════
// Tracking Service — ready for AfterShip/Ship24 integration
//
// SETUP: Set VITE_TRACKING_API_KEY in .env to activate auto-tracking.
// Without it, everything works manually (admin changes statuses by hand).
//
// Supported providers:
//   - "aftership" → AfterShip API (https://www.aftership.com/docs/tracking)
//   - "ship24"    → Ship24 API (https://docs.ship24.com)
//   - "manual"    → No API, manual only (default)
// ══════════════════════════════════════════════════════════════════════════════

const TRACKING_API_KEY = import.meta.env.VITE_TRACKING_API_KEY || "";
const TRACKING_PROVIDER: "aftership" | "ship24" | "manual" =
  (import.meta.env.VITE_TRACKING_PROVIDER as any) || "manual";

export const isAutoTrackingEnabled = !!TRACKING_API_KEY && TRACKING_PROVIDER !== "manual";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TrackingStatus {
  status: string;           // "in_transit", "out_for_delivery", "delivered", "exception", "pending"
  lastEvent: string;        // Human-readable last event
  lastChecked: string;      // ISO timestamp
  carrier: string | null;
  estimatedDelivery: string | null;
  raw?: any;                // Raw API response for debugging
}

// ── Carrier detection ──────────────────────────────────────────────────────────

const CARRIER_PATTERNS: Record<string, RegExp> = {
  dhl:        /^[0-9]{10,11}$|^JJD/,
  chronopost: /^[A-Z]{2}[0-9]{9}[A-Z]{2}$|^[0-9]{13}$/,
  colissimo:  /^[0-9A-Z]{13}$/,
  ups:        /^1Z/,
  fedex:      /^[0-9]{12,22}$/,
  tnt:        /^GE[0-9]{9}|^[0-9]{9}$/,
  dpd:        /^[0-9]{14}$/,
  gls:        /^[0-9]{11,12}$/,
};

export function detectCarrier(trackingNumber: string): string | null {
  const clean = trackingNumber.replace(/\s/g, "").toUpperCase();
  for (const [carrier, pattern] of Object.entries(CARRIER_PATTERNS)) {
    if (pattern.test(clean)) return carrier;
  }
  return null;
}

// ── AfterShip API ──────────────────────────────────────────────────────────────

async function fetchAfterShip(trackingNumber: string, carrier?: string): Promise<TrackingStatus | null> {
  if (!TRACKING_API_KEY) return null;

  try {
    // Create tracking if needed, then get status
    const slug = carrier || detectCarrier(trackingNumber) || "auto";

    const res = await fetch(
      `https://api.aftership.com/v4/trackings/${slug}/${trackingNumber}`,
      { headers: { "aftership-api-key": TRACKING_API_KEY, "Content-Type": "application/json" } }
    );

    if (res.status === 404) {
      // Auto-create tracking
      await fetch("https://api.aftership.com/v4/trackings", {
        method: "POST",
        headers: { "aftership-api-key": TRACKING_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ tracking: { tracking_number: trackingNumber, slug } }),
      });
      return { status: "pending", lastEvent: "Tracking créé, en attente de mise à jour", lastChecked: new Date().toISOString(), carrier: slug, estimatedDelivery: null };
    }

    if (!res.ok) return null;

    const data = await res.json();
    const tracking = data?.data?.tracking;
    if (!tracking) return null;

    const checkpoints = tracking.checkpoints || [];
    const lastCheckpoint = checkpoints[checkpoints.length - 1];

    return {
      status: mapAfterShipStatus(tracking.tag),
      lastEvent: lastCheckpoint?.message || tracking.tag || "—",
      lastChecked: new Date().toISOString(),
      carrier: tracking.slug,
      estimatedDelivery: tracking.expected_delivery || null,
      raw: tracking,
    };
  } catch (err) {
    console.error("AfterShip fetch error:", err);
    return null;
  }
}

function mapAfterShipStatus(tag: string): string {
  const map: Record<string, string> = {
    Pending: "pending",
    InfoReceived: "info_received",
    InTransit: "in_transit",
    OutForDelivery: "out_for_delivery",
    AttemptFail: "exception",
    Delivered: "delivered",
    AvailableForPickup: "out_for_delivery",
    Exception: "exception",
    Expired: "exception",
  };
  return map[tag] || "pending";
}

// ── Ship24 API ─────────────────────────────────────────────────────────────────

async function fetchShip24(trackingNumber: string): Promise<TrackingStatus | null> {
  if (!TRACKING_API_KEY) return null;

  try {
    const res = await fetch("https://api.ship24.com/public/v1/trackers/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${TRACKING_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ trackingNumber }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const tracking = data?.trackings?.[0];
    if (!tracking) return null;

    const events = tracking.events || [];
    const lastEvent = events[0];

    return {
      status: mapShip24Status(tracking.shipment?.statusMilestone),
      lastEvent: lastEvent?.description || "—",
      lastChecked: new Date().toISOString(),
      carrier: tracking.shipment?.carrier?.name || null,
      estimatedDelivery: tracking.shipment?.estimatedDeliveryDate || null,
      raw: tracking,
    };
  } catch (err) {
    console.error("Ship24 fetch error:", err);
    return null;
  }
}

function mapShip24Status(milestone: string): string {
  const map: Record<string, string> = {
    pending: "pending",
    info_received: "info_received",
    in_transit: "in_transit",
    out_for_delivery: "out_for_delivery",
    failed_attempt: "exception",
    delivered: "delivered",
    available_for_pickup: "out_for_delivery",
    exception: "exception",
  };
  return map[milestone] || "pending";
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Check tracking status for an order.
 * Returns null if auto-tracking is disabled or tracking number is missing.
 */
export async function checkTrackingStatus(
  trackingNumber: string,
  carrier?: string
): Promise<TrackingStatus | null> {
  if (!isAutoTrackingEnabled || !trackingNumber) return null;

  if (TRACKING_PROVIDER === "aftership") return fetchAfterShip(trackingNumber, carrier);
  if (TRACKING_PROVIDER === "ship24") return fetchShip24(trackingNumber);
  return null;
}

/**
 * Update an order's tracking status in Supabase.
 * Call this periodically (e.g., every 6h via cron or on admin page load).
 */
export async function refreshOrderTracking(orderId: string): Promise<TrackingStatus | null> {
  // Get order
  const { data: order } = await (supabase
    .from("orders" as any)
    .select("tracking_number, shipping_carrier, tracking_auto_enabled, status")
    .eq("id", orderId)
    .single() as any);

  if (!order?.tracking_number || !order.tracking_auto_enabled) return null;

  const result = await checkTrackingStatus(order.tracking_number, order.shipping_carrier);
  if (!result) return null;

  // Update order
  const updates: Record<string, any> = {
    tracking_status: result.status,
    tracking_last_event: result.lastEvent,
    tracking_last_checked: result.lastChecked,
    tracking_provider: TRACKING_PROVIDER,
  };

  if (result.carrier && !order.shipping_carrier) {
    updates.shipping_carrier = result.carrier;
  }

  // Auto-transition: if API says "delivered" and order is "shipped" → mark delivered
  if (result.status === "delivered" && order.status === "shipped") {
    updates.status = "delivered";
    updates.delivered_at = new Date().toISOString();
    updates.delivery_confirmed_by = "auto";
    updates.auto_delivery_confirmed = true;
    updates.balance_due_date = new Date(Date.now() + 7 * 86400000).toISOString();

    // Log event
    const { error: eventError } = await (supabase.from("order_events" as any).insert({
      order_id: orderId,
      event_type: "delivered",
      description: `Livraison confirmée automatiquement par ${TRACKING_PROVIDER}: "${result.lastEvent}"`,
      actor: "system",
      metadata: { provider: TRACKING_PROVIDER, raw_status: result.status },
    }) as any);
    if (eventError) console.error("Failed to insert order_event:", eventError.message);
  }

  const { error: updateError } = await (supabase.from("orders" as any).update(updates).eq("id", orderId) as any);
  if (updateError) console.error("Failed to update order tracking:", updateError.message);
  return result;
}

/**
 * Refresh tracking for ALL shipped orders.
 * Call this from an admin button or a scheduled cron.
 */
export async function refreshAllShippedOrders(): Promise<number> {
  if (!isAutoTrackingEnabled) return 0;

  const { data: orders, error: fetchError } = await (supabase
    .from("orders" as any)
    .select("id")
    .eq("status", "shipped")
    .eq("tracking_auto_enabled", true)
    .limit(200) as any);

  if (fetchError) {
    console.error("Failed to fetch shipped orders:", fetchError.message);
    return 0;
  }
  if (!orders || orders.length === 0) return 0;

  let updated = 0;
  for (const order of orders) {
    const result = await refreshOrderTracking(order.id);
    if (result) updated++;
    // Rate limit: wait 500ms between calls
    await new Promise(r => setTimeout(r, 500));
  }
  return updated;
}
