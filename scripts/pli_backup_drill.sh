#!/usr/bin/env bash
# PLI Stage F §25 — remote staging backup/restore drill (runs on the server).
# 1) record baseline counts  2) pg_dump live DB  3) create empty DB
# 4) restore  5) verify counts identical  6) run a temp API against restored DB
# (health + register+login+create pet + metrics)  7) cleanup. No staging data touched.
set -uo pipefail
FAILS=0
note(){ echo "$1"; }
pass(){ echo "PASS  $1"; }
fail(){ echo "FAIL  $1  ($2)"; FAILS=$((FAILS+1)); }

DBPW=$(grep -E '^POSTGRES_PASSWORD=' /opt/pli/.env | head -1 | cut -d= -f2-)
if [ -z "$DBPW" ]; then echo "FAIL  DRILL-00 read DB password from /opt/pli/.env"; exit 2; fi

PEXEC(){ sudo docker exec -e PGPASSWORD="$DBPW" pli-postgres-1 "$@"; }

# --- DRILL-01 baseline counts (live staging DB) ---
TABLES=$(PEXEC psql -U pli -d pli -tAc "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'alembic%' ORDER BY 1")
cnt_table(){ PEXEC psql -U pli -d "$1" -tAc "SELECT count(*) FROM \"$2\"" | tr -d ' '; }
BASELINE=""
for t in $TABLES; do BASELINE="$BASELINE $t=$(cnt_table pli "$t")"; done
note "DRILL-01 baseline counts captured (tables: $(echo "$TABLES" | wc -l))"

# --- DRILL-02 dump ---
PEXEC pg_dump -U pli -d pli -Fc -f /tmp/pli_backup_drill.dump
if PEXEC sh -lc 'test -s /tmp/pli_backup_drill.dump'; then pass "DRILL-02 pg_dump custom-format written"; else fail "DRILL-02 pg_dump" "missing"; fi

# --- DRILL-03 fresh empty DB ---
PEXEC psql -U pli -d postgres -c "DROP DATABASE IF EXISTS pli_restore_drill" >/dev/null
PEXEC psql -U pli -d postgres -c "CREATE DATABASE pli_restore_drill" >/dev/null
note "DRILL-03 created empty DB pli_restore_drill"

        # --- DRILL-04 restore ---
        PEXEC sh -lc "pg_restore -U pli -d pli_restore_drill --no-owner --no-privileges /tmp/pli_backup_drill.dump 2>/tmp/plidrill_restore_errors.txt"
        RCODE=$?
        if [ "$RCODE" = "0" ]; then pass "DRILL-04 pg_restore completed"; else fail "DRILL-04 pg_restore" "exit=$RCODE"; fi

        # --- DRILL-05 counts match ---
        DIFFS=""
        for t in $TABLES; do
          a=$(cnt_table pli "$t"); b=$(cnt_table pli_restore_drill "$t")
          [ "$a" != "$b" ] && DIFFS="$DIFFS $t:$a/$b"
        done
        if [ -z "$DIFFS" ]; then pass "DRILL-05 restored counts == baseline (all $(echo "$TABLES" | wc -l) tables)"; else fail "DRILL-05 counts match" "$DIFFS"; fi
# --- DRILL-06..09 temp API against restored DB ---
sudo docker inspect pli-api-1 --format '{{range .Config.Env}}{{println .}}{{end}}' \
  | sed "s|^DATABASE_URL=.*|DATABASE_URL=postgresql+asyncpg://pli:${DBPW}@postgres:5432/pli_restore_drill|" \
  | grep -vE '^(PATH=|GPG_KEY=|PYTHON_|LANG=|HOME=|SHLVL=|PWD=)' > /tmp/pli_drill_api.env
chmod 600 /tmp/pli_drill_api.env
sudo docker rm -f pli-restore-drill-api >/dev/null 2>&1 || true
sudo docker run -d --name pli-restore-drill-api --network pli_default \
  --env-file /tmp/pli_drill_api.env \
  -e LOCAL_UPLOAD_DIR=/tmp/pli_drill_uploads \
  -p 127.0.0.1:18803:8800 \
  --entrypoint uvicorn pli-api:staging app.main:app --host 0.0.0.0 --port 8800 --workers 1 >/dev/null
ok=0
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:18803/api/v1/health || true)
  if [ "$code" = "200" ]; then ok=1; break; fi
  sleep 2
done
if [ "$ok" = "1" ]; then pass "DRILL-06 temp API (restored DB) health 200"; else fail "DRILL-06 temp API health" "not 200 after 60s"; fi

EMAIL="drill-$(date +%s)@pli.test"
REG=$(curl -s -X POST http://127.0.0.1:18803/api/v1/auth/register -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"DrillPass!w0rd\",\"display_name\":\"恢复演练用户\"}")
VTOK=$(echo "$REG" | grep -o '"verification_token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$VTOK" ]; then curl -s -X POST http://127.0.0.1:18803/api/v1/auth/verify-email -H 'Content-Type: application/json' -d "{\"token\":\"$VTOK\"}" >/dev/null; fi
LOGIN=$(curl -s -X POST http://127.0.0.1:18803/api/v1/auth/login -H 'Content-Type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"DrillPass!w0rd\"}")
ATOK=$(echo "$LOGIN" | grep -o '"access_token":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -n "$ATOK" ]; then pass "DRILL-07 register+verify+login on restored DB"; else fail "DRILL-07 auth on restored DB" "no access token"; fi

PET=$(curl -s -X POST http://127.0.0.1:18803/api/v1/pets -H "Authorization: Bearer $ATOK" -H 'Content-Type: application/json' -d '{"name":"恢复演练犬","species":"dog"}')
if echo "$PET" | grep -q '"id"'; then pass "DRILL-08 create pet on restored DB"; else fail "DRILL-08 create pet" "$(echo "$PET" | head -c 120)"; fi

MET=$(curl -s http://127.0.0.1:18803/api/v1/metrics)
NOTE=$(echo "$MET" | grep -o '"pets_total":[0-9]*' | cut -d: -f2)
if [ -n "$NOTE" ] && [ "$NOTE" -ge 1 ]; then pass "DRILL-09 metrics on restored DB (pets_total=$NOTE)"; else fail "DRILL-09 metrics" "$(echo "$MET" | head -c 120)"; fi

# --- cleanup ---
sudo docker rm -f pli-restore-drill-api >/dev/null 2>&1
PEXEC psql -U pli -d postgres -c "DROP DATABASE IF EXISTS pli_restore_drill" >/dev/null
PEXEC sh -lc 'rm -f /tmp/pli_backup_drill.dump /tmp/plidrill_restore_errors.txt'
rm -f /tmp/pli_drill_api.env
pass "DRILL-10 cleanup complete (temp API removed, drill DB dropped)"

echo ""
echo "BACKUP/RESTORE DRILL SUMMARY: $([ "$FAILS" = 0 ] && echo ALL-PASS || echo "$FAILS FAILS")"
exit "$FAILS"