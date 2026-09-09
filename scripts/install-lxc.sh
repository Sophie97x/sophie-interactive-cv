#!/usr/bin/env bash
# Fresh Ubuntu/Debian LXC install. Run as root inside the new container.
set -euo pipefail
test "$(id -u)" = 0
test "$(systemd-detect-virt --container)" = lxc
test ! -e /opt/attic/app
test ! -e /etc/systemd/system/attic.service
: "${PUBLIC_ORIGIN:?Set PUBLIC_ORIGIN to the public HTTPS origin}"
case "$PUBLIC_ORIGIN" in https://*) ;; *) exit 1 ;; esac
install_source=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl xz-utils git
task_tmp=$(mktemp -d)
cd "$task_tmp"
curl --fail --location --proto '=https' --tlsv1.2 -o node.tar.xz https://nodejs.org/dist/v22.23.2/node-v22.23.2-linux-x64.tar.xz
printf '%s\n' 'd60acfe00a2932254bb0ad20e01b0d74397a0875595de719654b214f4b03f307  node.tar.xz' | sha256sum --check -
tar -xJf node.tar.xz -C /usr/local --strip-components=1
/usr/local/bin/node --version
id attic >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/attic --shell /usr/sbin/nologin attic
install -d -m 700 -o attic -g attic /var/lib/attic
install -d -m 755 -o attic -g attic /opt/attic
cp -a "$install_source" /opt/attic/app
chown -R attic:attic /opt/attic/app
runuser -u attic -- env PATH=/usr/local/bin:/usr/bin:/bin sh -c 'cd /opt/attic/app && npm ci && npm run typecheck && npm run lint && npm run build && npm test'
chown -R root:root /opt/attic/app
install -d -m 755 /etc/attic
printf 'PUBLIC_ORIGIN=%s\n' "$PUBLIC_ORIGIN" > /etc/attic/environment
chmod 600 /etc/attic/environment
cat > /etc/systemd/system/attic.service <<'UNIT'
[Unit]
Description=Little room CV builder
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=attic
Group=attic
WorkingDirectory=/opt/attic/app
Environment=NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATABASE_PATH=/var/lib/attic/attic.sqlite MAX_PROFILES=1000 ENABLE_PUBLISHING=true TRUST_CLOUDFLARE=false
EnvironmentFile=/etc/attic/environment
ExecStart=/usr/local/bin/node --experimental-strip-types scripts/preview.mjs
Restart=on-failure
RestartSec=5
UMask=0077
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/var/lib/attic
RestrictSUIDSGID=true
MemoryMax=768M
TasksMax=100

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now attic
curl --fail --retry 10 --retry-connrefused --retry-delay 1 http://127.0.0.1:3000/healthz
printf '\nInstalled. Connect a Cloudflare tunnel in this container to http://localhost:3000.\n'
