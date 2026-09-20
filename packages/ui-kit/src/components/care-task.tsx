import { cx } from "../lib/cx";
import { formatDateTime } from "../lib/format";
import { TokenIcon } from "./icons";

export interface CareTaskItem {
  title: string;
  status: string;
  due_at?: string | null;
  conflict_count?: number | null;
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: "待处理",
  IN_PROGRESS: "进行中",
  COMPLETED: "已完成",
  DONE: "已完成",
};

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

function isDone(status: string): boolean {
  return status === "COMPLETED" || status === "DONE" || status === "completed";
}

/** Care task row: title / status / due date / conflict warning / optional complete button. */
export function CareTask({
  task,
  onComplete,
  completing = false,
  className,
}: {
  task: CareTaskItem;
  onComplete?: () => void;
  completing?: boolean;
  className?: string;
}) {
  const done = isDone(task.status);
  const conflict = typeof task.conflict_count === "number" && task.conflict_count > 0;
  return (
    <div className={cx("pli-care-task", done && "pli-care-task--done", className)}>
      <div className="pli-care-task-head">
        <span className="pli-care-task-title">{task.title}</span>
        <span className={cx("pli-badge", done && "pli-badge--owner")}>{statusLabel(task.status)}</span>
      </div>
      <div className="pli-care-task-meta">
        {task.due_at ? <span>截止：{formatDateTime(task.due_at)}</span> : null}
        {conflict ? (
          <span className="pli-care-task-conflict">
            <TokenIcon name="alert-triangle" size={12} />
            与其他任务冲突（{task.conflict_count}）
          </span>
        ) : null}
      </div>
      {onComplete && !done ? (
        <div className="pli-care-task-actions">
          <button
            type="button"
            className="pli-btn"
            onClick={onComplete}
            disabled={completing}
          >
            {completing ? "处理中……" : "标记完成"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
