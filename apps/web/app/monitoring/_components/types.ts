/** OWN-013 Monitoring 页面共享类型。 */
export interface HomeSummary {
  pet_id: string;
  today_counts: Record<string, number>;
  note?: string;
}

export interface PetDevice {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
  last_sync?: string | null;
}

export interface ReviewItem {
  event_id: string;
  event_kind?: string;
  summary?: string;
  occurred_at?: string;
  candidate?: Record<string, unknown>;
}

export type ReviewDecision = "confirm" | "correct" | "reject";
