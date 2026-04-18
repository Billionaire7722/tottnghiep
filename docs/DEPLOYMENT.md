# Van Hanh Production CNXH

Tai lieu nay ghi lai cau hinh production hien tai de de bao tri ve sau.

## Tong quan

- Repo: `https://github.com/Billionaire7722/tottnghiep`
- VPS app path: `/opt/cnxh-quiz`
- Docker compose file: `/opt/cnxh-quiz/docker-compose.prod.yml`
- Docker project name: `cnxh_quiz`
- App noi bo: `http://127.0.0.1:8088`
- Domain chinh: `https://cnxh.space`
- Domain phu: `https://www.cnxh.space` -> redirect `301` ve `https://cnxh.space`

## Nginx reverse proxy

- Site config: `/etc/nginx/sites-available/cnxh-space`
- Symlink: `/etc/nginx/sites-enabled/cnxh-space`
- SSL cert: `/etc/letsencrypt/live/cnxh.space/fullchain.pem`
- SSL key: `/etc/letsencrypt/live/cnxh.space/privkey.pem`

Nginx dang proxy:

- `cnxh.space` -> `127.0.0.1:8088`
- `www.cnxh.space` -> `301` ve `https://cnxh.space`

## Security headers da bat tai nginx

- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Bien moi truong production

Can co trong ca:

- `/opt/cnxh-quiz/.env.production`
- `/opt/cnxh-quiz/.env`

Gia tri quan trong:

```dotenv
APP_PORT=8088
PUBLIC_ORIGIN=https://cnxh.space
```

## Cloudflare

DNS hien tai:

- `A @` -> origin cua VPS
- `CNAME www` -> `cnxh.space`

Khuyen nghi:

- Proxy status: bat orange cloud cho `@` va `www`
- SSL/TLS mode: `Full (strict)`

Canonical redirect nen dat tai Cloudflare bang `Single Redirect`:

- Rule name: `www-to-apex-cnxh`
- If incoming requests match:
  - Expression: `http.host eq "www.cnxh.space"`
- Then:
  - Type: Dynamic
  - Target URL: `concat("https://cnxh.space", http.request.uri.path)`
  - Preserve query string: On
  - Status code: `301`

Luu y: Single Redirect chi hoat dong khi hostname dang duoc proxy boi Cloudflare.

## Lenh bao tri nhanh

Kiem tra container:

```bash
cd /opt/cnxh-quiz
docker-compose -f docker-compose.prod.yml ps
```

Kiem tra logs:

```bash
cd /opt/cnxh-quiz
docker-compose -f docker-compose.prod.yml logs --tail=80 frontend backend
```

Kiem tra health:

```bash
curl -fsS http://127.0.0.1:8088/api/health
curl -I https://cnxh.space
curl -I https://www.cnxh.space
```

Deploy lai thu cong:

```bash
cd /opt/cnxh-quiz
git fetch origin main
git reset --hard origin/main
cp .env.production .env
chmod 600 .env
COMPOSE_PARALLEL_LIMIT=1 docker-compose -f docker-compose.prod.yml up -d --build --remove-orphans
```

Kiem tra nginx:

```bash
nginx -t
systemctl reload nginx
sed -n '1,260p' /etc/nginx/sites-available/cnxh-space
```

Kiem tra cert:

```bash
certbot certificates
```

## Can tranh

- Khong doi port `8088` neu chua kiem tra anh huong den nginx va Cloudflare.
- Khong sua cac site nginx khac trong `/etc/nginx/sites-available/` neu khong lien quan.
- Khong commit `.env`, khoa SSH, hoac Cloudflare token vao repo.
