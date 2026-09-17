#!/usr/bin/env bash
# PLI Stage F §26 — remote pilot gating exercise (reversible).
# 1) while PILOT_MODE=false: register a real admin user (real auth)
# 2) enable PILOT_MODE=true, recreate api
# 3) register without invite -> 422 (gating ON)
# 4) mint invite as the admin user -> 201
# 5) register WITH invite -> 201 (gating satisfied)
# 6) restore PILOT_MODE=false, recreate api, verify health + public smoke
set -uo pipefail
FAILS=0
pass(){ echo "PASS  $1"; }
fail(){ echo "FAIL  $1  ($2)"; FAILS=$((FAILS+1)); }
API="http://127.0.0.1:18800/api/v1"
PUB="https://staging.haoleilab.com/pli-api/api/v1"
ENVF=/opt/pli/.env
PW="Gating!w0rd2026"

restore(){ sudo cp /tmp/pli_env.bak "$ENVF" 2>/dev/null; cd /opt/pli && sudo docker compose -f docker-compose.haoleilab.yml up -d api >/dev/null 2>&1; }
trap restore EXIT

# --- 0 preconditions ---
[ -f "$ENVF" ] || { fail "PG-00 env" "missing"; exit 2; }
grep -q '^PILOT_MODE=true' "$ENVF" && { fail "PG-00 env" "already true"; exit 2; }
ADMEM="gateadmin-$(date +%s)@pli.test"

# --- 1 real admin user while gating off ---
REG=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMEM\",\"password\":\"$PW\",\"display_name\":\"闸门管理员\"}")
VTOK=$(echo "$REG" | grep -o '"verification_token":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$VTOK" ] && curl -s -X POST "$API/auth/verify-email" -H 'Content-Type: application/json' -d "{\"token\":\"$VTOK\"}" >/dev/null
LOGIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMEM\",\"password\":\"$PW\"}")
ATOK=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ATOK" ]; then pass "PG-01 real admin user registered (gating off)"; else fail "PG-01 admin register" "$(echo "$REG" | head -c 150)"; fi

# --- 2 enable PILOT_MODE ---
sudo cp "$ENVF" /tmp/pli_env.bak
sudo sed -i 's/^PILOT_MODE=.*/PILOT_MODE=true/' "$ENVF"
cd /opt/pli && sudo docker compose -f docker-compose.haoleilab.yml up -d api >/dev/null 2>&1
ok=0; for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' "$API/health" || true); [ "$code" = "200" ] && ok=1 && break; sleep 2; done
[ "$ok" = "1" ] && pass "PG-02 PILOT_MODE=true + api healthy" || fail "PG-02 api health" "$code"

PM=$(curl -s "$API/auth/status" | grep -o '"pilot_mode":[a-z]*')
echo "$PM" | grep -q 'true' && pass "PG-03 auth/status pilot_mode=true" || fail "PG-03 pilot_mode" "$PM"

# --- 3 register WITHOUT invite -> 422 ---
REGN=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"nopilot-$(date +%s)@pli.test\",\"password\":\"$PW\",\"display_name\":\"无码用户\"}")
if echo "$REGN" | grep -q '邀请码'; then pass "PG-04 register without code rejected (invite required)"; else fail "PG-04 register without code" "$(echo "$REGN" | head -c 160)"; fi

# --- 4 mint invite as real admin ---
INV=$(curl -s -X POST "$API/pilot/invites" -H "Authorization: Bearer $ATOK" \
  -H 'Content-Type: application/json' -d '{"purpose":"pilot","max_uses":1,"expires_hours":24}')
CODE=$(echo "$INV" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$CODE" ] && [ "$CODE" != "UNAUTHENTICATED" ]; then pass "PG-05 admin mints invite code"; else fail "PG-05 mint invite" "$(echo "$INV" | head -c 200)"; fi

# --- 5 register WITH invite -> 201 ---
REGY=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"pilotok-$(date +%s)@pli.test\",\"password\":\"$PW\",\"display_name\":\"有码用户\",\"invite_code\":\"$CODE\"}")
if echo "$REGY" | grep -q '"user_id"'; then pass "PG-06 register with invite accepted"; else fail "PG-06 register with invite" "$(echo "$REGY" | head -c 200)"; fi

# --- 6 restore ---
restore
ok=0; for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' "$API/health" || true); [ "$code" = "200" ] && ok=1 && break; sleep 2; done
[ "$ok" = "1" ] && pass "PG-07 restored PILOT_MODE=false, api healthy" || fail "PG-07 restore health" "$code"
PM2=$(curl -s "$API/auth/status" | grep -o '"pilot_mode":[a-z]*')
echo "$PM2" | grep -q 'false' && pass "PG-08 pilot_mode restored false" || fail "PG-08 pilot_mode restored" "$PM2"

# --- 7 public smoke after restore ---
EMAIL="after-$(date +%s)@pli.test"
REG=$(curl -s -X POST "$PUB/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\",\"display_name\":\"恢复后用户\"}")
VTOK=$(echo "$REG" | grep -o '"verification_token":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$VTOK" ] && curl -s -X POST "$PUB/auth/verify-email" -H 'Content-Type: application/json' -d "{\"token\":\"$VTOK\"}" >/dev/null
rl=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$PUB/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"$PW\"}")
[ "$rl" = "200" ] && pass "PG-09 public register+login after restore" || fail "PG-09 public smoke" "$rl"

sudo rm -f /tmp/pli_env.bak
echo ""
echo "PILOT GATING DRILL SUMMARY: $([ "$FAILS" = 0 ] && echo ALL-PASS || echo "$FAILS FAILS")"
exit "$FAILS"