/** DESIGN CANDIDATE（Stage H §44）——companion 页面共享类型。 */
export interface RemoteInteractionSession {
  session_id: string; // DESIGN CANDIDATE
  pet_id: string;
  actor_id: string;
  device_id: string | null;
  started_at: string;
  ended_at: string | null;
  interaction_types: string[];
  pet_observations: string[];
  owner_feedback: string[];
  safety_events: string[];
  outcome: string | null;
}

export interface DeviceInfo {
  device_id: string;
  provider: string;
  display_name: string;
  status: string;
}
