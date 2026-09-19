#!/usr/bin/env bash
# Wave 0 A4 — full no-intervention dry-run with invite on live staging.
# Temporarily enables PILOT_MODE, walks register->verify->login->pet->
# quick-log->timeline->feedback via API, restores PILOT_MODE=false.
# Dry-run user uses @pli.test domain (excluded from real pilot metrics).
set -uo pipefail
FAILS=0
pass(){ echo "PASS  $1"; }
fail(){ echo "FAIL  $1  ($2)"; FAILS=$((FAILS+1)); }
cd /opt/pli
API="http://127.0.0.1:18800/api/v1"
ENVF=/opt/pli/.env
PW="DryRun!w0rd2026"

restore(){ sudo cp /tmp/pli_env_dryrun.bak "$ENVF"; sudo docker compose -f docker-compose.haoleilab.yml up -d api >/dev/null 2>&1; }
trap restore EXIT

# --- 0 preconditions ---
grep -q '^PILOT_MODE=true' "$ENVF" && { fail "DR-00 env" "already true"; exit 2; }
sudo cp "$ENVF" /tmp/pli_env_dryrun.bak

# --- 1 admin user (gating still off) ---
ADMEM="dryadmin-$(date +%s)@pli.test"
REG=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$ADMEM\",\"password\":\"$PW\",\"display_name\":\"演练管理员\"}")
VTOK=$(echo "$REG" | grep -o '"verification_token":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$VTOK" ] && curl -s -X POST "$API/auth/verify-email" -H 'Content-Type: application/json' -d "{\"token\":\"$VTOK\"}" >/dev/null
LOGIN=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$ADMEM\",\"password\":\"$PW\"}")
ATOK=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$ATOK" ] && pass "DR-01 admin user registered+login" || { fail "DR-01 admin" "$(echo "$REG" | head -c 120)"; }

# --- 2 enable PILOT_MODE ---
sudo sed -i 's/^PILOT_MODE=.*/PILOT_MODE=true/' "$ENVF"
sudo docker compose -f docker-compose.haoleilab.yml up -d api >/dev/null 2>&1
ok=0; for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' "$API/health" || true); [ "$code" = "200" ] && ok=1 && break; sleep 2; done
[ "$ok" = "1" ] && pass "DR-02 PILOT_MODE=true api healthy" || fail "DR-02 health" "$code"

# --- 3 mint invite ---
INV=$(curl -s -X POST "$API/pilot/invites" -H "Authorization: Bearer $ATOK" \
  -H 'Content-Type: application/json' -d '{"purpose":"wave0-dryrun","max_uses":1,"expires_hours":24}')
CODE=$(echo "$INV" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$CODE" ] && [ "$CODE" != "UNAUTHENTICATED" ] && pass "DR-03 invite minted" || fail "DR-03 invite" "$(echo "$INV" | head -c 120)"

# --- 4 register dry-run user WITH invite (the real-user path) ---
UEMAIL="dryrun-$(date +%s)@pli.test"
REGU=$(curl -s -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$UEMAIL\",\"password\":\"$PW\",\"display_name\":\"演练宠主\",\"invite_code\":\"$CODE\"}")
VTOK2=$(echo "$REGU" | grep -o '"verification_token":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$VTOK2" ] && curl -s -X POST "$API/auth/verify-email" -H 'Content-Type: application/json' -d "{\"token\":\"$VTOK2\"}" >/dev/null
LOGIN2=$(curl -s -X POST "$API/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$UEMAIL\",\"password\":\"$PW\"}")
ATOK2=$(echo "$LOGIN2" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$ATOK2" ] && pass "DR-04 register(with invite)+verify+login" || fail "DR-04 user flow" "$(echo "$REGU" | head -c 160)"

# --- 5 create pet ---
PET=$(curl -s -X POST "$API/pets" -H "Authorization: Bearer $ATOK2" -H 'Content-Type: application/json' \
  -d '{"name":"演练犬Wave0","species":"dog","breed":"","sex":"UNKNOWN"}')
PID=$(echo "$PET" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$PID" ] && pass "DR-05 pet created (no dev intervention)" || fail "DR-05 pet" "$(echo "$PET" | head -c 160)"

# --- 6 first quick log event ---
EV=$(curl -s -X POST "$API/pets/$PID/events" -H "Authorization: Bearer $ATOK2" -H 'Content-Type: application/json' \
  -d '{"event_type":"daily.meal","payload":{"food_type":"狗粮","amount":"100","unit":"g"}}')
EVID=$(echo "$EV" | grep -o '"event_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$EVID" ] && pass "DR-06 first quick-log event written" || fail "DR-06 event" "$(echo "$EV" | head -c 160)"

# --- 7 timeline readable ---
TL=$(curl -s -o /dev/null -w '%{http_code}' "$API/pets/$PID/events" -H "Authorization: Bearer $ATOK2")
[ "$TL" = "200" ] && pass "DR-07 timeline readable" || fail "DR-07 timeline" "$TL"

# --- 8 today readable ---
TD=$(curl -s -o /dev/null -w '%{http_code}' "$API/pets/$PID/today" -H "Authorization: Bearer $ATOK2")
[ "$TD" = "200" ] && pass "DR-08 today readable" || fail "DR-08 today" "$TD"

# --- 9 feedback from dry-run user ---
FB=$(curl -s -X POST "$API/pilot/feedback" -H "Authorization: Bearer $ATOK2" -H 'Content-Type: application/json' \
  -d '{"category":"other","message":"Wave0 演练 dry-run 反馈通道验证","page_url":"/timeline"}')
FID=$(echo "$FB" | grep -o '"feedback_id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$FID" ] && pass "DR-09 feedback submitted" || fail "DR-09 feedback" "$(echo "$FB" | head -c 120)"

# --- 10 restore + metrics exclude dry-run user ---
restore
ok=0; for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' "$API/health" || true); [ "$code" = "200" ] && ok=1 && break; sleep 2; done
[ "$ok" = "1" ] && pass "DR-10 restored PILOT_MODE=false api healthy" || fail "DR-10 restore" "$code"
PM=$(curl -s "$API/pilot/status" | grep -o '"pets_total":[0-9]*')
echo "$PM" | grep -q '"pets_total":0' && pass "DR-11 pilot metrics exclude dry-run data (pets_total=0)" || fail "DR-11 metrics" "$PM"

echo ""
echo "WAVE0 DRYRUN SUMMARY: $([ "$FAILS" = 0 ] && echo ALL-PASS || echo "$FAILS FAILS")"
exit "$FAILS"
