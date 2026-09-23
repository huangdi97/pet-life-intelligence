export interface EmergencyProfile {
  owner_contact: string;
  backup_contact: string;
  vet_clinic_name: string;
  vet_clinic_phone: string;
  vet_clinic_address_text: string;
  critical_care_notes: string;
  updated_at: string;
}

export interface AuditRow {
  id: string;
  occurred_at: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
}
