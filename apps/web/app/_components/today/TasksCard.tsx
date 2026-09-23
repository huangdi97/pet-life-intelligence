"use client";

import type { Task } from "@pli/api-client";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/i18n";
import { State } from "../../../components/ui";

interface TasksCardProps {
  hasPet: boolean;
  tasks: Async<Task[]>;
}

/** OWN-001 Today Tasks（今天）卡片。 */
export function TasksCard({ hasPet, tasks }: TasksCardProps) {
  return (
    <div className="card">
      <h2>今天</h2>
      {hasPet ? (
        <State
          state={tasks.state}
          error={tasks.error ? mapErrorMessage(tasks.error) : null}
          onRetry={tasks.reload}
          empty="没有待办任务。"
        >
          <ul className="tl">
            {tasks.data?.map((task) => (
              <li key={task.id}>
                <div className="tl-head">
                  <span className="tl-type">{task.status === "COMPLETED" ? "✓" : "○"} {task.title}</span>
                  <span className="tl-time">{task.due_at ? `due ${fmtTime(task.due_at)}` : "无截止"}</span>
                </div>
              </li>
            ))}
          </ul>
        </State>
      ) : (
        <div className="state">请先在顶部选择一只宠物。</div>
      )}
    </div>
  );
}
