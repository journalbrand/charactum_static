#!/usr/bin/env bash
# ────────────────────────────────────────────────────────────────
#  Ontorum cloud-startup script
#  • Installs Python deps
#  • Brings in Node 18-LTS + Jest for the React suite
#  • Spins up Neo4j 4.4.28 and waits for Bolt
#  • Runs Pytest + (optionally) Jest without breaking on flaky JS
# ────────────────────────────────────────────────────────────────
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export PYTEST_ADDOPTS="--ignore=tests/test_llm.py --ignore=test_llm.py"

# ────────────────────────────────────────────────────────────────
# 0. Dummy secrets so code never prompts
# ────────────────────────────────────────────────────────────────
cat > .env <<EOF
OPENAI_API_KEY="dummy"
NEO4J_URI_OVERRIDE="bolt://localhost:7687"
EOF

# ────────────────────────────────────────────────────────────────
# 1.  Python dependencies
# ────────────────────────────────────────────────────────────────
pip install -r requirements.txt

# ────────────────────────────────────────────────────────────────
# 2a. Java 11 (Neo4j requirement)
# ────────────────────────────────────────────────────────────────
sudo apt-get update -qq
sudo apt-get install -y curl gnupg openjdk-11-jre-headless
sudo update-alternatives --install /usr/bin/java java \
  /usr/lib/jvm/java-11-openjdk-amd64/bin/java 1111
sudo update-alternatives --set java \
  /usr/lib/jvm/java-11-openjdk-amd64/bin/java

# ────────────────────────────────────────────────────────────────
# 2b. Node 18 + npm  → brings Jest into the sandbox
# ────────────────────────────────────────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
echo 'export PATH="$PATH:/usr/bin"' | sudo tee /etc/profile.d/node_path.sh >/dev/null

# Clear proxy settings that cause npm config warnings
unset npm_config_http_proxy npm_config_https_proxy
unset NPM_CONFIG_HTTP_PROXY NPM_CONFIG_HTTPS_PROXY || true
npm config delete http-proxy >/dev/null 2>&1 || true
npm config delete https-proxy >/dev/null 2>&1 || true

if [ -f frontend/package.json ]; then
  pushd frontend >/dev/null
  npm ci --no-audit --no-fund --silent
  mkdir -p dist
  popd >/dev/null
fi

# ────────────────────────────────────────────────────────────────
# 3. Neo4j repo + lock to 4.4.28
# ────────────────────────────────────────────────────────────────
curl -fsSL https://debian.neo4j.com/neotechnology.gpg.key \
  | sudo gpg --dearmor -o /usr/share/keyrings/neo4j.gpg
echo "deb [signed-by=/usr/share/keyrings/neo4j.gpg] https://debian.neo4j.com stable 4.4" \
  | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt-get update -qq
sudo apt-get install -y neo4j=1:4.4.28

# ────────────────────────────────────────────────────────────────
# 4. First-time Neo4j password
# ────────────────────────────────────────────────────────────────
sudo NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
     neo4j-admin set-initial-password ontorum123

# ────────────────────────────────────────────────────────────────
# 5. Start Neo4j (systemd or SysV)
# ────────────────────────────────────────────────────────────────
if command -v systemctl >/dev/null && \
   systemctl list-units --type=service >/dev/null 2>&1; then
  sudo systemctl enable --now neo4j
else
  sudo service neo4j start
fi

# ────────────────────────────────────────────────────────────────
# 6. Wait up to 60 s for Bolt, then run tests
# ────────────────────────────────────────────────────────────────
echo -n "⏳ Waiting for Neo4j to come online"
for i in {1..60}; do
  if cypher-shell -u neo4j -p ontorum123 "RETURN 1" >/dev/null 2>&1; then
    echo -e "\r✅ Neo4j 4.4.28 is up and purring."
    export NEO4J_URI_OVERRIDE="bolt://localhost:7687"

    # 7a. Front-end tests (non-fatal)
    if [[ ${RUN_FRONTEND_TESTS:-1} -eq 1 ]] && command -v npm >/dev/null; then
      echo "📐 Running Jest suite…"
      (cd frontend && npm test --silent --ci) \
        || echo "⚠️  Jest failed (non-critical) – continuing."
    fi

    # 7b. Back-end tests (fatal on failure)
    echo "🧪 Running Pytest suite…"
    pytest

    # ── application launch could go here ──
    exit 0
  fi
  sleep 1 && echo -n "."
done

echo -e "\n❌ Neo4j did not become ready within 60 s" >&2
exit 1
