"use client";

/**
 * ADM-003 Users — 用户列表 / grants / is_demo 标记。
 * 后端尚未提供管理端用户查询接口（Step 0 盘点无 /admin/* 路由），
 * 按规范渲染诚实的"能力未开放"状态，不展示占位 / 伪造数据。
 */
export default function UsersPage() {
  return (
    <main>
      <h1>用户</h1>
      <p className="sub">用户列表、授权记录与演示标记</p>

      <div className="state">
        能力未开放
        <br />
        <span className="muted">
          管理端的用户查询接口尚未接入，此页暂不展示数据。
          <br />
          后端接口就绪后，这里将显示用户列表与其授权记录。
        </span>
      </div>
    </main>
  );
}
