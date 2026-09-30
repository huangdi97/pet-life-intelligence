"use client";

import { PersonChip } from "@pli/ui-kit";
import { State } from "../../../components/ui";
import type { Async } from "../../../lib/hooks";
import { mapErrorMessage, t } from "../../../lib/i18n";
import type { PetFriend } from "./types";

interface FriendsPanelProps {
  friends: Async<PetFriend[]>;
  friendName: (id: string) => string;
}

/** 伙伴关系状态 → 用户语言（绝不泄漏 raw 枚举）。 */
function statusZh(status: string): string {
  if (status === "ACTIVE") return t("social.familiar");
  if (status === "PENDING") return "待确认";
  if (status === "BLOCKED") return "已屏蔽";
  if (status === "DECLINED") return "已拒绝";
  return "朋友";
}

/** OWN-012 Social — 伙伴关系列表。 */
export function FriendsPanel({ friends, friendName }: FriendsPanelProps) {
  return (
    <div className="card" data-testid="pli.social.friends">
      <h2>宠物朋友</h2>
      <State
        state={friends.state}
        error={friends.error ? mapErrorMessage(friends.error) : null}
        onRetry={friends.reload}
        empty="还没有伙伴关系。"
      >
        {friends.data?.map((f) => (
          <li key={f.request_id} data-testid={`pli.social.friends.${f.request_id}`}>
            <PersonChip name={friendName(f.friend_pet_id)} role={statusZh(f.status)} />
          </li>
        ))}
      </State>
    </div>
  );
}
