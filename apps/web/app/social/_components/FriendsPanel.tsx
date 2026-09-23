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

/** OWN-012 Social — 伙伴关系列表。 */
export function FriendsPanel({ friends, friendName }: FriendsPanelProps) {
  return (
    <div className="card">
      <h2>宠物朋友</h2>
      <State
        state={friends.state}
        error={friends.error ? mapErrorMessage(friends.error) : null}
        onRetry={friends.reload}
        empty="还没有伙伴关系。"
      >
        {friends.data?.map((f) => (
          <li key={f.request_id}>
            <PersonChip
              name={friendName(f.friend_pet_id)}
              role={f.status === "ACTIVE" ? t("social.familiar") : f.status}
            />
          </li>
        ))}
      </State>
    </div>
  );
}
