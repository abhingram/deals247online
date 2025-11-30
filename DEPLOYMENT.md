# Production Deployment Guide for Deals247

## 🚀 Deployment Options

### Option 1: Vercel + PlanetScale (Recommended for Quick Setup)
### Option 2: Railway + Railway Database
### Option 3: DigitalOcean App Platform
### Option 4: AWS/Heroku + AWS RDS
### Option 5: VPS (DigitalOcean/Nginx/PM2)

---

## 📋 Prerequisites

Before deploying, ensure you have:

1. **Firebase Project** configured with Authentication
2. **MySQL Database** (production instance)
3. **Domain name** (optional but recommended)
4. **SSL Certificate** (usually provided by hosting platforms)

---

## 🔥 Option 1: Vercel + PlanetScale (Easiest)

### Step 1: Set up PlanetScale Database

1. Go to [PlanetScale](https://planetscale.com) and create an account
2. Create a new database
3. Get your connection credentials

### Step 2: Deploy Backend to Vercel

1. **Create Vercel Account**: Go to [vercel.com](https://vercel.com)

2. **Install Vercel CLI**:
```bash
npm install -g vercel
```

3. **Deploy Backend**:
```bash
cd server
vercel --prod
```

4. **Configure Environment Variables** in Vercel:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PORT=5000`
- Firebase config variables

### Step 3: Deploy Frontend to Vercel

1. **Build the Frontend**:
```bash
npm run build
```

2. **Deploy Frontend**:
```bash
vercel --prod
```

3. **Update API URL** in Vercel environment:
```
VITE_API_URL=https://your-backend-url.vercel.app/api
```

---

## 🚂 Option 2: Railway (Full-Stack)

### Step 1: Set up Railway

1. Go to [railway.app](https://railway.app) and create an account
2. Connect your GitHub repository

### Step 2: Deploy Database

1. Add MySQL database service in Railway
2. Get connection credentials

### Step 3: Deploy Application

1. **Create `railway.json`** in project root:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run server"
  }
}
```

2. **Environment Variables** in Railway:
```
DB_HOST=${{ MYSQLHOST }}
DB_USER=${{ MYSQLUSER }}
DB_PASSWORD=${{ MYSQLPASSWORD }}
DB_NAME=${{ MYSQLDATABASE }}
PORT=5000
VITE_API_URL=https://your-app.railway.app/api
```

---

## 🐙 Option 3: DigitalOcean App Platform

### Step 1: Create App Spec

Create `app.yaml` in project root:

```yaml
name: deals247
services:
- name: api
  source_dir: server
  github:
    repo: yourusername/deals247
    branch: main
  run_command: npm run server
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: DB_HOST
    value: ${db.HOSTNAME}
  - key: DB_USER
    value: ${db.USERNAME}
  - key: DB_PASSWORD
    value: ${db.PASSWORD}
  - key: DB_NAME
    value: ${db.DATABASE}
  - key: PORT
    value: "5000"

- name: web
  source_dir: /
  github:
    repo: yourusername/deals247
    branch: main
  build_command: npm run build
  run_command: npm run preview
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: VITE_API_URL
    value: ${api.PUBLIC_URL}/api

databases:
- name: db
  engine: MYSQL
  version: "8"
  size: db-s-dev-database
  num_nodes: 1
```

### Step 2: Deploy

1. Go to DigitalOcean App Platform
2. Create new app from GitHub
3. Use the app spec above

---

## ☁️ Option 4: AWS/Heroku + RDS

### Step 1: Set up AWS RDS MySQL

1. Create RDS MySQL instance
2. Configure security groups
3. Get connection details

### Step 2: Deploy to Heroku

1. **Create Heroku App**:
```bash
heroku create your-app-name
```

2. **Add Buildpacks**:
```bash
heroku buildpacks:add heroku/nodejs
heroku buildpacks:add https://github.com/heroku/heroku-buildpack-static
```

3. **Configure Environment**:
```bash
heroku config:set DB_HOST=your-rds-endpoint
heroku config:set DB_USER=your-db-user
heroku config:set DB_PASSWORD=your-db-password
heroku config:set DB_NAME=your-db-name
heroku config:set VITE_API_URL=https://your-app.herokuapp.com/api
```

4. **Deploy**:
```bash
git push heroku main
```

---

## 🖥️ Option 5: VPS Deployment (Most Control)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Install MySQL client (if using external DB)
sudo apt install mysql-client -y
```

### Step 2: Database Setup

```bash
# If using local MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Create database
mysql -u root -p
CREATE DATABASE deals247_prod;
CREATE USER 'deals247'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON deals247_prod.* TO 'deals247'@'localhost';
FLUSH PRIVILEGES;
```

### Step 3: Deploy Application

```bash
# Clone repository
git clone https://github.com/yourusername/deals247.git
cd deals247

# Install dependencies
npm install

# Build frontend
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Step 4: Nginx Configuration

Create `/etc/nginx/sites-available/deals247`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/deals247 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com
```

---

## 🔧 Environment Configuration

### Production Environment Variables

Create `.env.production`:

```env
# Database
DB_HOST=your-production-db-host
DB_PORT=3306
DB_NAME=deals247_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# API
VITE_API_URL=https://your-api-domain.com/api
PORT=5000

# Firebase (Production Project)
VITE_FIREBASE_API_KEY=your-prod-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-prod-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-prod-project
VITE_FIREBASE_STORAGE_BUCKET=your-prod-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
VITE_FIREBASE_APP_ID=your-prod-app-id

# Security
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret
```

---

## 📊 Database Migration

### Run Schema Scripts

```bash
# Connect to production database
mysql -h your-db-host -u your-user -p your-database < create-tables.sql
mysql -h your-db-host -u your-user -p your-database < business_schema.sql
```

---

## 🔍 Monitoring & Maintenance

### PM2 Monitoring

```bash
# Check app status
pm2 status

# View logs
pm2 logs

# Restart app
pm2 restart deals247

# Monitor resources
pm2 monit
```

### Nginx Logs

```bash
# Check access logs
sudo tail -f /var/log/nginx/access.log

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Change PORT in environment variables
2. **Database connection**: Verify credentials and firewall rules
3. **CORS issues**: Update allowed origins in production
4. **Build failures**: Check Node.js version compatibility
5. **Memory issues**: Increase server resources or optimize app

### Performance Optimization

1. **Enable gzip compression** in Nginx
2. **Set up Redis** for session storage (optional)
3. **Configure database connection pooling**
4. **Set up CDN** for static assets
5. **Enable HTTP/2** in Nginx

---

## 🎯 Recommended Production Stack

- **Frontend**: Vercel or Netlify
- **Backend**: Railway or DigitalOcean App Platform
- **Database**: PlanetScale or AWS RDS
- **Domain**: Cloudflare or Route 53
- **Monitoring**: Sentry or LogRocket

Would you like me to help you set up any specific deployment option?