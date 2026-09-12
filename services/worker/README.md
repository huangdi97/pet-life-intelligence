# Worker

用于：
- notification jobs
- care grant expiry
- media post-processing
- async AI jobs

关键事实仍需持久化到 PostgreSQL，不能只存在 Redis/内存。
