# 🚀 Quick Production Deployment Guide

## Prerequisites
- Node.js 18+
- Git
- Firebase project configured
- MySQL database (production)

## Option 1: Vercel (Recommended - 5 minutes)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy backend
cd server
vercel --prod

# 4. Deploy frontend
cd ..
npm run build
vercel --prod

# 5. Set environment variables in Vercel dashboard
# VITE_API_URL=https://your-backend.vercel.app/api
```

## Option 2: Railway (Full-stack - 10 minutes)

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login and connect repo
railway login
railway link

# 3. Deploy
railway deploy

# 4. Set environment variables in Railway dashboard
```

## Option 3: Docker (Local/Cloud - 15 minutes)

```bash
# 1. Copy environment file
cp .env.production.example .env.production
# Edit `.env.production` with your production values (do NOT commit secrets to the repo)

# 2. Validate env before deploy
#    Make sure the following variables are exported or available in `.env.production`:
#      DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET, SESSION_SECRET
#    If you enable DB SSL, set DB_SSL=true and provide DB_SSL_CA_PATH=/path/to/ca.pem
node server/scripts/validate-prod-env.js

# 2.1 Hostinger remote DB checklist
#  - In Hostinger control panel: create a database and a restricted DB user for the app
#  - Whitelist this VPS IP in Hostinger's remote DB access settings: 72.61.235.42
#  - Optionally enable SSL/TLS for MySQL and obtain the CA file path
#  - Use the provided SQL template to create the production user: server/sql/create_production_user.sql
#  Example:
#    Replace <DB_USER>, <VPS_IP_or_%> and <DB_NAME> and run the SQL in Hostinger DB console
#    CREATE USER 'deals247_user'@'72.61.235.42' IDENTIFIED BY 'strongpassword';
#    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, INDEX ON `u515501238_deals247_db`.* TO 'deals247_user'@'72.61.235.42';
#    FLUSH PRIVILEGES;
#
#  - Test connection from VPS before importing schema:
#    mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p"$DB_PASSWORD" -e "SELECT 1;"
#  - If DB SSL is required by Hostinger, set DB_SSL=true and DB_SSL_CA_PATH to the CA file available on the VPS

# 3. Build and deploy with Docker Compose (recommended for full-stack deploy)
#    Two deployment modes:
#    - Full stack on server (app + db + redis) - use `docker-compose.yml`
#    - App-only using external DB (Hostinger) - use `docker-compose.hostinger.yml` and ensure `.env.production` contains Hostinger DB credentials

# Example: Build and bring up containers (Hostinger external DB mode)
DB_HOST=srv994.hstgr.io DB_PORT=3306 DB_NAME=u515501238_deals247_db DB_USER=u515501238_deals247_user DB_PASSWORD=your_db_password \
  docker compose -f docker-compose.hostinger.yml --env-file .env.production up -d --build

# Example: Full local stack (not recommended on small VPS unless required)
docker compose --env-file .env.production up -d --build

# Notes:
# - If you are using Hostinger-managed DB, prefer app-only compose (`docker-compose.hostinger.yml`) so database remains managed externally
# - Ensure Hostinger allows your server IP to connect to the DB (whitelist) and that the DB user has remote access
# - Do NOT commit secrets; use env files or host secret store

# 4. Verify service health
#    - Check docker-compose logs
#    - Use `docker ps` and `docker-compose ps` to confirm containers are healthy
#    - Use `curl http://localhost:5000/api/ready` to confirm the backend readiness (DB + Redis)
#    - If readiness returns 503, check DB and Redis connectivity in server logs

# 4. Alternative: PM2 on a VPS
#    - Install Node.js and PM2
#    - Copy `.env.production` to server
#    - Start backend with: `pm2 start ecosystem.config.js --env production`
#    - Frontend: build with `npm run build` and serve with static server or Nginx

```

## Option 4: VPS (Most Control - 30 minutes)

```bash
# 1. Server setup
sudo apt update && sudo apt install -y nodejs npm nginx mysql-client

# 2. Clone and build
git clone https://github.com/yourusername/deals247.git
cd deals247
npm install
npm run build

# 3. Install PM2
sudo npm install -g pm2

# 4. Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# 5. Configure Nginx (copy nginx.conf to /etc/nginx/nginx.conf)
sudo systemctl reload nginx
```

## Environment Variables Required

```env
# Database
DB_HOST=your-db-host
DB_NAME=deals247_prod
DB_USER=your-username
DB_PASSWORD=your-password

# Firebase
VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_PROJECT_ID=your-project

# API
VITE_API_URL=https://your-domain.com/api
```

## Database Setup

```bash
# Run schema scripts
mysql -h your-host -u your-user -p your-db < create-tables.sql
mysql -h your-host -u your-user -p your-db < business_schema.sql
```

## Post-Deployment Checklist

- [ ] Test user registration/login
- [ ] Verify deal browsing works
- [ ] Check admin panel access
- [ ] Test search functionality
- [ ] Verify notifications work
- [ ] Check mobile responsiveness
- [ ] Set up SSL certificate
- [ ] Configure domain DNS
- [ ] Set up monitoring (optional)

## Need Help?

Check the full `DEPLOYMENT.md` guide for detailed instructions on each platform.

## Quick Commands

```bash
# Check app status (PM2)
pm2 status

# View logs
pm2 logs

# Restart app
pm2 restart deals247

# Check database connection
mysql -h your-host -u your-user -p -e "SELECT 1"
```