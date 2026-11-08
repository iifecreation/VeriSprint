#!/usr/bin/env bash
# Lets only Cloudflare's servers reach ports 80/443. Anyone hitting the
# server's IP directly (bypassing Cloudflare's firewall, DDoS protection and
# HTTPS) is dropped. Installed and run at boot + weekly by setup-server.sh.
#
# Docker-published ports skip the normal INPUT chain, so the rules go in
# DOCKER-USER, the chain Docker reserves for exactly this.
set -euo pipefail

ext_if="$(ip route get 1.1.1.1 | awk '{for (i=1;i<=NF;i++) if ($i=="dev") print $(i+1); exit}')"

apply() {
  local tool="$1" list_url="$2"
  command -v "$tool" >/dev/null 2>&1 || return 0
  local ranges
  if ! ranges="$(curl -fsS --max-time 20 "$list_url")" || [ -z "$ranges" ]; then
    echo "Could not download $list_url — keeping existing $tool rules." >&2
    return 0
  fi
  "$tool" -N DOCKER-USER 2>/dev/null || true
  "$tool" -N VERISPRINT-CF 2>/dev/null || true
  "$tool" -F VERISPRINT-CF
  for cidr in $ranges; do
    "$tool" -A VERISPRINT-CF -s "$cidr" -j RETURN
  done
  "$tool" -A VERISPRINT-CF -j DROP
  # Send outside traffic for 80/443 through the allow-list (added once).
  if ! "$tool" -C DOCKER-USER -i "$ext_if" -p tcp -m multiport --dports 80,443 -j VERISPRINT-CF 2>/dev/null; then
    "$tool" -I DOCKER-USER 1 -i "$ext_if" -p tcp -m multiport --dports 80,443 -j VERISPRINT-CF
  fi
  echo "$tool: allowed $(echo "$ranges" | wc -w) Cloudflare ranges on $ext_if ports 80/443"
}

apply iptables https://www.cloudflare.com/ips-v4
apply ip6tables https://www.cloudflare.com/ips-v6
