# Security / Privacy

## 数据最小化
- 不因为“以后可能有用”采集多余个人数据。
- 媒体与医疗材料只保存必要字段。
- 日志中禁止记录完整正文/文件。

## Access Control
- RBAC：Owner / Co-owner / Family / Temporary / Professional
- ABAC：pet_id、household、grant scope、time window、consent、resource sensitivity

## Tokens
Care Card token：
- random
- short-lived / explicit expiry
- revocable
- scope-limited
- audit access

## Upload
- allowlist file type
- size limit
- MIME + signature validation
- random object key
- malware scan boundary
- hash

## Deletion
- soft delete + retention where required
- user-visible deletion request state
- artifacts and derived indexes handled
- audit/legal constraints documented
