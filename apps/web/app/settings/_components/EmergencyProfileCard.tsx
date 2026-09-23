"use client";

import { State } from "../../../components/ui";
import { type Async } from "../../../lib/hooks";
import type { EmergencyProfile } from "./types";

interface EmergencyProfileCardProps {
  profile: Async<EmergencyProfile>;
  form: EmergencyProfile | null;
  onFieldChange: (key: keyof EmergencyProfile, value: string) => void;
  onSave: () => void;
}

/** PLI-014 紧急联系卡：可编辑的主人/医院联系方式与关键照护备注。 */
export function EmergencyProfileCard({ profile, form, onFieldChange, onSave }: EmergencyProfileCardProps) {
  return (
    <div className="card">
      <h2>紧急联系卡</h2>
      <State state={profile.state} error={profile.error} onRetry={profile.reload}>
        {(form ?? profile.data) && (
          <>
            <div className="grid2">
              <label className="field">
                主人联系方式
                <input
                  value={form?.owner_contact ?? profile.data?.owner_contact ?? ""}
                  onChange={(e) => onFieldChange("owner_contact", e.target.value)}
                />
              </label>
              <label className="field">
                备用联系人
                <input
                  value={form?.backup_contact ?? profile.data?.backup_contact ?? ""}
                  onChange={(e) => onFieldChange("backup_contact", e.target.value)}
                />
              </label>
              <label className="field">
                首选医院（文字，非地图）
                <input
                  value={form?.vet_clinic_name ?? profile.data?.vet_clinic_name ?? ""}
                  onChange={(e) => onFieldChange("vet_clinic_name", e.target.value)}
                />
              </label>
              <label className="field">
                医院电话
                <input
                  value={form?.vet_clinic_phone ?? profile.data?.vet_clinic_phone ?? ""}
                  onChange={(e) => onFieldChange("vet_clinic_phone", e.target.value)}
                />
              </label>
            </div>
            <label className="field">
              医院地址（文字）
              <textarea
                rows={2}
                value={form?.vet_clinic_address_text ?? profile.data?.vet_clinic_address_text ?? ""}
                onChange={(e) => onFieldChange("vet_clinic_address_text", e.target.value)}
              />
            </label>
            <label className="field">
              关键照护备注 / 行为禁忌
              <textarea
                rows={2}
                value={form?.critical_care_notes ?? profile.data?.critical_care_notes ?? ""}
                onChange={(e) => onFieldChange("critical_care_notes", e.target.value)}
              />
            </label>
            <button className="btn primary" onClick={onSave}>
              保存
            </button>
          </>
        )}
      </State>
    </div>
  );
}
