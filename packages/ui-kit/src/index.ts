// @pli/ui-kit — Design System v1 components (Stage H).
// Source-only package: consumers transpile it (like @pli/api-client).
// Styling: import "@pli/ui-tokens/css" (design tokens) AND
// "@pli/ui-kit/styles.css" (component classes) at the app root.

// primitives
export { PetAvatar, type AvatarSize } from "./components/pet-avatar";
export { PetSwitcher, type PetOption } from "./components/pet-switcher";
export { PersonChip } from "./components/person-chip";
export { CitationChip } from "./components/citation-chip";
export { Skeleton } from "./components/skeleton";
export { Toast, type ToastKind } from "./components/toast";
export { TokenIcon, type IconName } from "./components/icons";

// overlays
export { Modal } from "./components/modal";
export { Sheet } from "./components/sheet";
export { QuickLogSheet, type QuickLogType } from "./components/quick-log-sheet";

// states
export { State, type LoadState } from "./components/state";
export { EmptyState } from "./components/empty-state";
export { ErrorState } from "./components/error-state";

// timeline & events
export { EventCard, type EventCardEvent } from "./components/event-card";
export { TimelineItem, type TimelineItemProps } from "./components/timeline-item";

// metrics & trends
export { MetricCard } from "./components/metric-card";
export { TrendCard, type TrendDirection } from "./components/trend-card";

// risk & safety
export {
  RiskBanner,
  type RiskLevel,
} from "./components/risk-banner";
export { RedFlagReason, type RedFlagReasonItem } from "./components/red-flag-reason";
export { EmergencyAction } from "./components/emergency-action";
export { NextActionCard } from "./components/next-action-card";

// evidence & vet brief
export { EvidenceList, type EvidenceItem } from "./components/evidence-list";
export { EvidenceCard, type EvidenceMedia } from "./components/evidence-card";
export {
  VetBriefSection,
  VET_BRIEF_SECTIONS,
} from "./components/vet-brief-section";

// care & social & devices
export { CareTask, type CareTaskItem } from "./components/care-task";
export { DeviceStatus, type DeviceState } from "./components/device-status";
export { InteractionCard } from "./components/interaction-card";
export { CompanionControl } from "./components/companion-control";

// AI & consent
export { AIAnswer, type AISource } from "./components/ai-answer";
export { ConsentPanel, type ConsentItem } from "./components/consent-panel";
