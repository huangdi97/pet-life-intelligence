"use client";

import type { Task } from "@pli/api-client";
import { fmtTime, type Async } from "../../../lib/hooks";
import { mapErrorMessage } from "../../../lib/i18n";
import { State } from "../../../components/ui";
import { Icon } from "../../../components/icons";

interface TasksCardProps {
  hasPet: boolean;
  tasks: Async<Task[]>;
}

/** OWN-001 Today Tasks — 今天的任务（开放区块，向量图标，无 emoji）。 */
export function TasksCard({ hasPet, tasks }: TasksCardProps) {
  return (
    <div className="v4-sec">
      <div className="v4-sec-head">
        <h2 className="v4-sec-title">今天</h2>
      </div>
      {hasPet ? (
        <State
          state={tasks.state}
          error={tasks.error ? mapErrorMessage(tasks.error) : null}
          onRetry={tasks.reload}
          empty="没有待办任务。"
        >
          {tasks.data?.map((task) => (
            <div key={task.id} className="ls-item" style={{ gridTemplateColumns: "auto 1fr" }}>
              <span className="ls-time">{task.due_at ? fmtTime(task.due_at).slice(11, 16) : "无截止"}</span>
              <div className="ls-body">
                <div className="ls-title">
                  <span className="ls-title-icon">
                    <Icon name={task.status === "COMPLETED" ? "check" : "clock"} size={14} />
                  </span>
                  {task.title}
                </div>
              </div>
            </div>
          ))}
        </State>
      ) : (
        <div className="v4-calm">
          <span className="v4-calm-icon">
            <Icon name="paw" size={18} />
          </span>
          <p className="v4-calm-body">请先在顶部选择一只宠物。</p>
        </div>
      )}
    </div>
  );
}
