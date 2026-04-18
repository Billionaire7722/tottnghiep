# CI/CD GitHub Actions cho CNXH

Không commit file `.env` hoặc secret lên GitHub. Trên VPS, app nên nằm trong thư mục riêng, ví dụ `/opt/cnxh-quiz`, và chạy bằng `docker compose --env-file .env.production -f docker-compose.prod.yml`.

## GitHub Secrets cần tạo

Tạo các secret này trong GitHub repository:

- `VPS_HOST`: IP hoặc domain của VPS.
- `VPS_USER`: user SSH dùng để deploy.
- `VPS_SSH_KEY`: private key SSH có quyền vào VPS.
- `VPS_PORT`: cổng SSH, thường là `22`.
- `DEPLOY_PATH`: đường dẫn deploy, ví dụ `/opt/cnxh-quiz`.

Nếu hiện tại VPS chỉ dùng mật khẩu SSH, nên tạo SSH key riêng cho deploy rồi tắt deploy bằng mật khẩu trong GitHub Actions.

## Deploy script gợi ý

Workflow có thể chạy các lệnh sau trên VPS:

```bash
set -euo pipefail
cd "$DEPLOY_PATH"
git fetch origin main
git reset --hard origin/main
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
docker image prune -f
```

## File môi trường trên VPS

Tạo file `$DEPLOY_PATH/.env.production` trên VPS, không commit file này:

```dotenv
APP_PORT=8088
PUBLIC_ORIGIN=https://cnxh.space
POSTGRES_USER=cnxh
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=cnxh_db
JWT_SECRET=CHANGE_ME_LONG_RANDOM_SECRET
ADMIN_USERNAME=admin
ADMIN_PASSWORD=CHANGE_ME
ADMIN_DISPLAY_NAME=Quản trị viên
```

`APP_PORT` nên chọn cổng chưa được 3 dự án khác dùng. PostgreSQL không publish ra ngoài, chỉ frontend public port được mở.

Production hiện tại dùng nginx shared trên VPS để reverse proxy domain `cnxh.space` và `www.cnxh.space` về `127.0.0.1:8088`. Xem thêm ghi chú vận hành tại `docs/DEPLOYMENT.md`.
