import { useCallback, useEffect, useState } from "react";
import { View, Text, Button } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api } from "../../services/api";
import { usePets } from "../../utils/usePets";
import { fmtTime } from "../../utils/format";

interface Grant {
  id: string;
  user_id: string;
  scopes: string[];
  expires_at: string | null;
  status: string;
}

export default function Care() {
  const { petId } = usePets();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const load = useCallback((pid: string) => {
    setState("loading");
    api
      .get<Grant[]>(`/pets/${pid}/grants`)
      .then((rows) => {
        setGrants(rows);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, []);

  useEffect(() => {
    if (petId) load(petId);
  }, [petId, load]);

  async function revoke(grantId: string) {
    try {
      await api.del(`/grants/${grantId}`);
      if (petId) load(petId);
      Taro.showToast({ title: "已撤销", icon: "success" });
    } catch {
      Taro.showToast({ title: "操作失败", icon: "none" });
    }
  }

  return (
    <View className="page">
      <View className="h1">照护协作</View>
      <View className="sub">家庭成员、临时授权与到期</View>

      {state === "loading" && <View className="state">加载中……</View>}
      {state === "error" && (
        <View className="state state-error">
          出错了
          <Button className="btn" onClick={() => petId && load(petId)}>重试</Button>
        </View>
      )}
      {state === "ready" && grants.length === 0 && <View className="state">还没有照护授权。</View>}
      {grants.map((g) => (
        <View className="card" key={g.id}>
          <View className="row" style={{ justifyContent: "space-between" }}>
            <Text style={{ fontWeight: 600 }}>{g.scopes.join(" / ")}</Text>
            <Text className="badge">{g.status}</Text>
          </View>
          <View className="muted">
            {g.expires_at ? `到期 ${fmtTime(g.expires_at)}` : "长期有效"}
          </View>
          {g.status === "ACTIVE" && (
            <Button className="btn btn-danger" size="mini" onClick={() => revoke(g.id)}>
              撤销授权
            </Button>
          )}
        </View>
      ))}
    </View>
  );
}