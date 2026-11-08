#!/usr/bin/env bash
# One-time setup for a fresh Ubuntu 22.04/24.04 server (Oracle Cloud Always
# Free Ampere/ARM, or any other Ubuntu VM). Run it as the default user:
#
#   sudo ./setup-server.sh
#
# What it does:
#   1. Installs security updates and turns on automatic security updates.
#   2. Installs Docker from Docker's official apt repository.
#   3. Hardens SSH: key-only login, no root login (keeps your current session).
#   4. Installs fail2ban to block repeated SSH login attempts.
#   5. Installs a firewall service that lets only Cloudflare reach ports 80/443
#      (see cloudflare-firewall.sh), so nobody can bypass Cloudflare.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo ./setup-server.sh" >&2
  exit 1
fi
here="$(cd "$(dirname "$0")" && pwd)"
target_user="${SUDO_USER:-ubuntu}"

echo "==> 1/5 Updates"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y ca-certificates curl gnupg git unattended-upgrades fail2ban iptables-persistent openssl
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> 2/5 Docker (official repository)"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
usermod -aG docker "$target_user"
systemctl enable --now docker

echo "==> 3/5 SSH hardening"
# Only applies if this user already logs in with a key — otherwise you'd be locked out.
if [ -s "/home/${target_user}/.ssh/authorized_keys" ]; then
  cat > /etc/ssh/sshd_config.d/99-verisprint-hardening.conf <<'CONF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
X11Forwarding no
MaxAuthTries 3
CONF
  sshd -t && systemctl reload ssh || systemctl reload sshd || true
else
  echo "    Skipped: no SSH key found for ${target_user}; add one before disabling passwords."
fi

echo "==> 4/5 fail2ban"
cat > /etc/fail2ban/jail.d/sshd.local <<'CONF'
[sshd]
enabled = true
maxretry = 5
bantime = 1h
CONF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "==> 5/5 Cloudflare-only firewall"
# Oracle's Ubuntu images ship a FORWARD REJECT rule that breaks Docker networking.
iptables -D FORWARD -j REJECT --reject-with icmp-host-prohibited 2>/dev/null || true
netfilter-persistent save >/dev/null 2>&1 || true
install -m 0755 "$here/cloudflare-firewall.sh" /usr/local/sbin/verisprint-cloudflare-firewall
cat > /etc/systemd/system/verisprint-firewall.service <<'UNIT'
[Unit]
Description=Allow only Cloudflare to reach ports 80/443 (VeriSprint)
After=docker.service network-online.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/verisprint-cloudflare-firewall
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
UNIT
# Refresh Cloudflare's IP list weekly.
cat > /etc/systemd/system/verisprint-firewall.timer <<'UNIT'
[Unit]
Description=Weekly refresh of Cloudflare IP ranges (VeriSprint)

[Timer]
OnCalendar=weekly
Persistent=true

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now verisprint-firewall.service verisprint-firewall.timer

echo
echo "Done. Log out and back in so '${target_user}' can use docker without sudo."
echo "Next: follow DEPLOY.md step 6 (create deploy/.env and start the stack)."
