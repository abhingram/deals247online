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
cp .env.production .env

# 2. Edit .env with your production values

# 3. Deploy with Docker Compose
docker-compose up -d --build

# 4. Check logs
docker-compose logs -f
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