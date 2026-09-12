# Tests

执行 Agent 应补齐：
- unit/
- integration/
- contract/
- e2e/
- ai-evals/
- safety/

禁止只写 happy path。
至少有：
- cross-pet isolation
- expired grant
- revoked token
- duplicate task completion
- duplicate medication administration
- event idempotency
- event supersedes
- red-flag downgrade attempt
- AI schema failure
