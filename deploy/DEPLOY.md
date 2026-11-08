# Deploying VeriSprint for free (Oracle Cloud + Cloudflare)

This puts the whole product — website, dashboard, operator console, API,
background worker, Postgres and Redis — on **one Oracle Cloud "Always Free"
server**, with **Cloudflare's free plan** in front for HTTPS, caching, DDoS
protection and a firewall. Hosting costs $0/month.

**What you still pay for or need:**
- **A domain name** (about $10/year from Cloudflare Registrar, Namecheap, etc.).
  Cloudflare needs a domain whose DNS it controls.
- **A credit/debit card for Oracle's identity check.** Oracle places a small
  temporary hold; Always Free resources are not charged.
- **Claude API usage** for analysis, chat and reports (billed per use by Anthropic).

Plan on about an hour the first time.

---

## Step 1 — Create the Oracle Cloud server

1. Sign up at <https://www.oracle.com/cloud/free/>. Pick your **home region**
   carefully — Always Free servers can only be created there and it can't be
   changed later. Busy regions often show "out of capacity"; a less popular
   region in your continent is usually easier.
2. In the console: **Compute → Instances → Create instance**.
3. **Image:** Canonical Ubuntu 24.04 (the *aarch64* / ARM build).
4. **Shape:** *Change shape → Ampere → VM.Standard.A1.Flex*, **2 OCPUs, 12 GB
   memory** (the current Always Free allowance — anything bigger is billed).
5. **SSH keys:** upload your public key (`~/.ssh/id_ed25519.pub`; create one
   with `ssh-keygen -t ed25519` if you don't have one).
6. **Boot volume:** 100 GB is plenty and within the free 200 GB total.
7. Create it, then copy the **public IP address** from the instance page.

If you get "Out of host capacity", try again later or pick a different
availability domain — it's a capacity issue, not your settings.

## Step 2 — Open ports in Oracle's network

**Networking → Virtual cloud networks → (your VCN) → Security Lists →
Default Security List → Add Ingress Rules:**

| Source CIDR | Protocol | Port |
|---|---|---|
| `0.0.0.0/0` | TCP | 80 |
| `0.0.0.0/0` | TCP | 443 |

It's fine that these are open to everyone here: the server's own firewall
(installed in step 5) only lets **Cloudflare** through on 80/443.

For extra safety, edit the existing SSH (port 22) rule so its source is
**your own IP address** (`x.x.x.x/32`) instead of `0.0.0.0/0`.

## Step 3 — Put your domain on Cloudflare

1. Create a free account at <https://dash.cloudflare.com>, **Add a site**,
   choose the **Free** plan, and change your domain's nameservers to the two
   Cloudflare gives you (at your registrar). Wait until Cloudflare says *Active*.
2. **DNS → Records**, add five `A` records pointing at the server's public IP,
   all **Proxied (orange cloud)**:

   | Name | Points to |
   |---|---|
   | `@` | server IP |
   | `www` | server IP |
   | `app` | server IP |
   | `admin` | server IP |
   | `api` | server IP |

3. **SSL/TLS → Overview:** set encryption mode to **Full (strict)**.
4. **SSL/TLS → Edge Certificates:** turn on **Always Use HTTPS**, set
   **Minimum TLS Version** to **1.2**.
5. **Security → Bots:** turn on **Bot Fight Mode**.
6. **Security → WAF → Rate limiting rules** (one rule is free): create
   *"Login protection"* — when **URI Path equals `/auth/login`**, more than
   **10 requests per 1 minute** from the same IP → **Block for 10 minutes**.
   (The app already limits logins too; this stops floods before they reach you.)

## Step 4 — Create the Cloudflare origin certificate

This encrypts traffic between Cloudflare and your server.

1. **SSL/TLS → Origin Server → Create Certificate.** Keep the defaults
   (RSA, hostnames `*.yourdomain.com` and `yourdomain.com`, 15 years).
2. Keep that page open — you'll paste both blocks onto the server in step 6.
   (The private key is shown **only once**.)

## Step 5 — Prepare the server

From your computer:

```bash
ssh ubuntu@YOUR_SERVER_IP
```

On the server (if your repository is private, create a GitHub
*fine-grained personal access token* with read-only access to this repo and
use it as the password when cloning):

```bash
git clone https://github.com/YOUR_ACCOUNT/verisprint-project.git
cd verisprint-project/deploy
sudo ./setup-server.sh
exit
```

`setup-server.sh` installs security updates (and turns on automatic ones),
Docker, key-only SSH, fail2ban, and the Cloudflare-only firewall. Log back in
afterwards so your user can run Docker:

```bash
ssh ubuntu@YOUR_SERVER_IP
cd verisprint-project/deploy
```

## Step 6 — Configure

1. **Secrets:** generate `deploy/.env` with strong random passwords and keys:

   ```bash
   ./generate-env.sh yourdomain.com
   nano .env
   ```

   Fill in the **GitHub App** values, **ANTHROPIC_API_KEY** and
   **RESEND_API_KEY** (Resend sends invite and password-reset emails). Leave
   the generated secrets as they are.

2. **Origin certificate** from step 4:

   ```bash
   mkdir -p certs
   nano certs/origin.pem       # paste the "Origin Certificate" block
   nano certs/origin-key.pem   # paste the "Private Key" block
   sudo chown root:root certs/origin.pem certs/origin-key.pem
   sudo chmod 644 certs/origin.pem
   sudo chmod 600 certs/origin-key.pem
   ```

3. **GitHub App settings** (github.com → Settings → Developer settings → GitHub Apps → your app):
   - Webhook URL: `https://api.yourdomain.com/github/webhook`
   - Webhook secret: the `GITHUB_WEBHOOK_SECRET` value from `deploy/.env`
   - Callback URL: `https://api.yourdomain.com/auth/github/callback`

## Step 7 — Start everything

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
docker compose -f docker-compose.prod.yml --env-file .env ps
```

The first build takes 5–15 minutes. When it's done, every service should be
`running` (and `migrate` should have *exited (0)* — it only runs migrations).

If the API keeps restarting, read why:

```bash
docker compose -f docker-compose.prod.yml --env-file .env logs api --tail 50
```

A message starting **"Refusing to start in production"** lists exactly which
setting is missing or unsafe.

Then open:
- `https://yourdomain.com` — website
- `https://app.yourdomain.com` — dashboard
- `https://api.yourdomain.com/health` — should show `{"status":"ok"}`

## Step 8 — Create your operator account

```bash
docker compose -f docker-compose.prod.yml --env-file .env exec api python -m app.cli create-superadmin
```

Sign in at `https://admin.yourdomain.com`. In **Pricing**, set your plan
prices; in **Flags**, turn on the features you want customers to have.

## Step 9 — Lock the operator console behind Cloudflare Access (recommended)

The operator console can see every customer, so add a second lock in front of
it. Cloudflare Zero Trust is free for up to 50 users.

1. Cloudflare dashboard → **Zero Trust** (pick the Free plan).
2. **Access → Applications → Add an application → Self-hosted.**
3. Domain: `admin.yourdomain.com`. Policy: **Allow** — *Emails* — your email
   address(es).

Now anyone opening the console must first prove they own one of those email
addresses (Cloudflare emails a one-time code), *before* the login page even loads.

## Step 10 — Backups

A database dump is written every night to `deploy/backups/` and kept for 14
days. That protects against mistakes, but not against losing the server, so
also copy them somewhere else regularly. Easiest, from your own computer:

```bash
scp -r ubuntu@YOUR_SERVER_IP:verisprint-project/deploy/backups ./verisprint-backups
```

To restore a dump (this replaces the current data):

```bash
gunzip -c backups/verisprint-YYYYMMDD-HHMM.sql.gz | \
  docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres psql -U verisprint verisprint
```

## Updating to a new version

```bash
cd ~/verisprint-project/deploy
./update.sh
```

It pulls the latest code, rebuilds, runs database migrations, and restarts.

## Monitoring (free)

- Create a free monitor at <https://uptimerobot.com> for
  `https://api.yourdomain.com/health/ready` so you're emailed if the site goes down.
- The operator console's **Errors** and **Metrics** panels show app errors.
- Set `OPERATOR_ALERT_EMAIL` in `deploy/.env` to get emailed about serious errors.

## Security summary

| Layer | Protection |
|---|---|
| Cloudflare | HTTPS, DDoS protection, bot blocking, login rate-limit rule, Access in front of the operator console |
| Server firewall | Only Cloudflare can reach ports 80/443; SSH key-only, fail2ban, automatic security updates |
| Containers | Database and Redis never exposed; non-root, no extra Linux privileges, memory limits, password-protected Redis |
| Application | Refuses to start with weak config; strict security headers and CSP; rate limits; single-use refresh tokens; hashed API tokens; input limits; SSRF and open-redirect guards |

## Troubleshooting

| Symptom | Fix |
|---|---|
| Cloudflare error 521/522 | The stack isn't running or ports 80/443 aren't open in step 2. Check `docker compose ... ps`. |
| Cloudflare error 526 | Origin certificate missing or wrong — redo step 4/6, and make sure SSL mode is *Full (strict)*. |
| API restarts, log says "Refusing to start in production" | Fix the settings it lists in `deploy/.env`, then `docker compose ... up -d`. |
| `400 Invalid host header` | You're using a hostname that isn't `api.<DOMAIN>`; add it to `ALLOWED_HOSTS` in `deploy/.env`. |
| Sign-in emails never arrive | `RESEND_API_KEY` missing, or your sending domain isn't verified in Resend. |
| Oracle "Out of host capacity" | Retry later or use another availability domain/region. |
