#!/usr/bin/env bash
# One-shot deploy for Odd Bird pricing. Reads secrets from ./.env. Safe to re-run.
#   bash scripts/deploy.sh            # everything
#   bash scripts/deploy.sh supabase   # database + logins only
#   bash scripts/deploy.sh github     # site only
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Missing .env: copy .env.example to .env and fill it in"; exit 1; }
set -a; . ./.env; set +a
WHAT="${1:-all}"
API=https://api.supabase.com/v1
REF="${SUPABASE_PROJECT_REF:?set SUPABASE_PROJECT_REF}"
AUTH=(-H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN:?set SUPABASE_ACCESS_TOKEN}" -H "Content-Type: application/json")
jsonstr() { node -e 'process.stdout.write(JSON.stringify(require("fs").readFileSync(0,"utf8")))'; }
run_sql() { # label, sql on stdin
  echo "  -> $1"
  local body; body=$(printf '{"query": %s}' "$(jsonstr)")
  local out; out=$(curl -sS -X POST "$API/projects/$REF/database/query" "${AUTH[@]}" -d "$body")
  if echo "$out" | grep -q '"message"'; then echo "    SQL error: $out"; exit 1; fi
}

if [ "$WHAT" = all ] || [ "$WHAT" = supabase ]; then
  echo "1/4 Database schema, market data, private costs"
  run_sql schema < supabase/migrations/20261116000000_init.sql
  run_sql "approval gate" < supabase/migrations/20261117000000_approval.sql
  [ -f private/seed_market.sql ] && run_sql "market data (private)" < private/seed_market.sql
  [ -f private/seed_styles.sql ] && run_sql "styles and costs (private)" < private/seed_styles.sql
  : "${ADMIN_EMAIL:?set ADMIN_EMAIL}"
  node -e 'process.stdout.write("insert into public.admin_emails (email) values (" + "\x27" + process.argv[1].replace(/\x27/g, "\x27\x27") + "\x27" + ") on conflict do nothing;")' "$ADMIN_EMAIL" | run_sql "admin email"

  echo "2/4 Auth: turn off public sign-ups"
  curl -sS -X PATCH "$API/projects/$REF/config/auth" "${AUTH[@]}" -d '{"disable_signup": true}' >/dev/null && echo "  sign-ups disabled"

  echo "3/4 Logins"
  KEYS=$(curl -sS "$API/projects/$REF/api-keys?reveal=true" "${AUTH[@]}")
  SERVICE=$(echo "$KEYS" | node -e 'const k=JSON.parse(require("fs").readFileSync(0));const s=k.find(x=>x.name==="service_role")||k.find(x=>x.type==="secret");process.stdout.write(s.api_key)')
  ANON=$(echo "$KEYS" | node -e 'const k=JSON.parse(require("fs").readFileSync(0));const s=k.find(x=>x.name==="anon")||k.find(x=>x.type==="publishable");process.stdout.write(s.api_key)')
  URL="https://$REF.supabase.co"
  mkuser() { # email password name
    local body; body=$(node -e 'process.stdout.write(JSON.stringify({email:process.argv[1],password:process.argv[2],email_confirm:true,user_metadata:{display_name:process.argv[3]}}))' "$1" "$2" "$3")
    local out; out=$(curl -sS -X POST "$URL/auth/v1/admin/users" -H "apikey: $SERVICE" -H "Authorization: Bearer $SERVICE" -H "Content-Type: application/json" -d "$body")
    if echo "$out" | grep -q '"id"'; then echo "  created $3"; elif echo "$out" | grep -qi 'already'; then echo "  $3 already exists (password unchanged)"; else echo "  user error: $out"; exit 1; fi
  }
  mkuser "$ADMIN_EMAIL" "${ADMIN_PASSWORD:?set ADMIN_PASSWORD}" "Admin"
  if [ -n "${TEAM_LOGINS:-}" ]; then
    IFS=',' read -ra TEAM <<< "$TEAM_LOGINS"
    for t in "${TEAM[@]}"; do IFS=':' read -r e p n <<< "$t"; [ -n "$e" ] && mkuser "$e" "$p" "${n:-$e}"; done
  fi

  echo "  writing web/src/config.js"
  node -e '
    const fs=require("fs"); const p="web/src/config.js"; let s=fs.readFileSync(p,"utf8");
    s=s.replace(/SUPABASE_URL = .*;/, `SUPABASE_URL = ${JSON.stringify(process.argv[1])};`)
       .replace(/SUPABASE_ANON_KEY = .*;/, `SUPABASE_ANON_KEY = ${JSON.stringify(process.argv[2])};`);
    fs.writeFileSync(p,s);' "$URL" "$ANON"
fi

if [ "$WHAT" = all ] || [ "$WHAT" = github ]; then
  echo "4/4 GitHub repo + Pages"
  : "${GITHUB_TOKEN:?set GITHUB_TOKEN}"; : "${GITHUB_REPO:?set GITHUB_REPO like yourname/odd-bird-pricing}"
  GH=(-H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json")
  NAME="${GITHUB_REPO#*/}"
  if [ "$(curl -s -o /dev/null -w '%{http_code}' "${GH[@]}" "https://api.github.com/repos/$GITHUB_REPO")" != 200 ]; then
    curl -sS -X POST "${GH[@]}" https://api.github.com/user/repos -d "{\"name\":\"$NAME\",\"private\":false,\"description\":\"Odd Bird pricing\"}" >/dev/null && echo "  repo created"
  fi
  TMP=$(mktemp -d)
  git -C "$TMP" init -q -b main
  # private/ (real costs), weekly/ (data files) and .env never leave this computer
  tar --exclude=./node_modules --exclude=./dist --exclude=./.env --exclude=./.git --exclude=./private --exclude=./weekly -cf - . | tar -xf - -C "$TMP"
  git -C "$TMP" add -A
  git -C "$TMP" -c user.name="Odd Bird pricing" -c user.email="deploy@users.noreply.github.com" commit -qm "Deploy $(date -u +%F\ %H:%M)" || true
  git -C "$TMP" push -q -f "https://x-access-token:$GITHUB_TOKEN@github.com/$GITHUB_REPO.git" main && echo "  pushed"
  rm -rf "$TMP"
  curl -sS -X POST "${GH[@]}" "https://api.github.com/repos/$GITHUB_REPO/pages" -d '{"build_type":"workflow"}' >/dev/null || true
  echo "  Site (live in about 2 minutes): https://${GITHUB_REPO%%/*}.github.io/$NAME/"
fi
echo "Done"
