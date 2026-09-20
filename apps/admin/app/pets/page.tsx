"use client";

import Link from "next/link";
import { api, type Pet } from "@pli/api-client";
import { fmtDate } from "../../lib/format";
import { State } from "../../components/State";
import { useAsync } from "../../lib/useAsync";

/** ADM-004 Pets — 宠物列表（/pets，返回当前账号可访问的宠物档案） */
export default function AdminPetsPage() {
  const pets = useAsync<Pet[]>(() => api.get<Pet[]>("/pets"), []);

  return (
    <main>
      <h1>宠物档案</h1>
      <p className="sub">当前管理账号可访问的宠物档案（不修改任何医疗事件）</p>

      <div className="card">
        <h2>宠物列表</h2>
        <State state={pets.state} error={pets.error} onRetry={pets.reload} empty="暂无可访问的宠物档案">
          <table>
            <thead>
              <tr>
                <th>名字</th>
                <th>物种</th>
                <th>品种</th>
                <th>性别</th>
                <th>出生日期</th>
                <th>建档时间</th>
                <th>编号</th>
              </tr>
            </thead>
            <tbody>
              {pets.data?.map((p) => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.species}</td>
                  <td>{p.breed || "—"}</td>
                  <td>{p.sex || "—"}</td>
                  <td>{p.birth_date ? fmtDate(p.birth_date) : "—"}</td>
                  <td>{fmtDate(p.created_at)}</td>
                  <td className="mono">{p.id.slice(0, 8)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </State>
      </div>

      <div className="card">
        <h2>相关页面</h2>
        <div className="row">
          <Link className="btn" href="/audit">
            审计日志（按宠物查看）
          </Link>
          <Link className="btn" href="/devices">
            设备数据（按宠物查看）
          </Link>
        </div>
      </div>
    </main>
  );
}
