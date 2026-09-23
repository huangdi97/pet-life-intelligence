/** TodayScreen helpers (colocated): response model + today-task ordering. */
import type { LifeEvent, Task } from "../api";

export interface TodayResp {
  date: string;
  event_counts: Record<string, number>;
  events: LifeEvent[];
}

/** 今天任务 (✓/○): open tasks first, then tasks completed today. */
export function todayTasks(tasks: Task[]): Task[] {
  const open = tasks.filter((t) => t.status === "OPEN");
  const today = new Date().toDateString();
  const doneToday = tasks.filter(
    (t) =>
      t.status === "COMPLETED" &&
      t.completed_at !== null &&
      new Date(t.completed_at).toDateString() === today,
  );
  return [...open, ...doneToday].slice(0, 6);
}
