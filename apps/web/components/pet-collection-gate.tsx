"use client";

import type { LoadState } from "../lib/hooks";

/** Loading, permission and network failure are NEVER equivalent to no pets. */
export function PetCollectionGate({
  surface, state, onRetry,
}: { surface: "today" | "assistant" | "timeline"; state: LoadState; onRetry: () => void }) {
  if (state === "loading") {
    return <main className="v4-main"><div role="status" className="v4-loading" data-testid={`pli.${surface}.pets-loading`}>
      <span className="spinner" aria-hidden="true" />正在读取宠物档案……
    </div></main>;
  }
  const denied = state === "denied";
  return <main className="v4-main">
    <section className="v4-sec" role="alert" data-testid={`pli.${surface}.pets-error`}>
      <h1>{denied ? "无法访问宠物档案" : "宠物档案暂时无法加载"}</h1>
      <p className="v4-calm-body">
        {denied
          ? "当前账号没有读取这些档案的权限。请确认登录与家庭授权状态。"
          : "网络或服务暂不可用。不会将读取失败误认为没有宠物，也不会替换正在查看的宠物身份。"}
      </p>
      <button type="button" className="v4-action v4-action--primary"
        data-testid={`pli.${surface}.pets-retry`} onClick={onRetry}>重新加载</button>
    </section>
  </main>;
}
