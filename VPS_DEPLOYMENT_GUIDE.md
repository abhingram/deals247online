# Hostinger VPS Deployment Guide - Deals247

## 📋 Prerequisites Checklist

Before starting, collect this information:

- [ ] VPS IP Address: `72.61.235.42 / srv1174752.hstgr.cloud`
- [ ] SSH Username: `root`
- [ ] SSH Password/Key: `___________________`
- [ ] Domain Name: `___________________`
- [ ] MySQL Root Password (you'll create): `___________________`
- [ ] Database Name: `deals247_db`
- [ ] Database User: `deals247_user`
- [ ] Database Password: `___________________`

---

## 🚀 Step-by-Step Deployment

### Step 1: Connect to Your VPS

```bash
# Replace YOUR_VPS_IP with your actual IP
ssh root@YOUR_VPS_IP

# If using custom username
ssh username@YOUR_VPS_IP -p 22
```

### Step 2: Update System & Install Required Software

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install MySQL
sudo apt install -y mysql-server

# Install Nginx (web server)
sudo apt install -y nginx

# Install Git
sudo apt install -y git

# Install PM2 (process manager)
sudo npm install -g pm2

# Install build tools
sudo apt install -y build-essential
```

### Step 3: Secure MySQL

```bash
# Run MySQL secure installation
sudo mysql_secure_installation

# Follow prompts:
# - Set root password: YES (choose a strong password)
# - Remove anonymous users: YES
# - Disallow root login remotely: YES
# - Remove test database: YES
# - Reload privilege tables: YES
```

### Step 4: Create Database & User

```bash
# Login to MySQL
sudo mysql -u root -p

# Run these SQL commands (replace passwords with your own):
```

```sql
CREATE DATABASE deals247_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'deals247_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON deals247_db.* TO 'deals247_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 5: Clone Your Application

```bash
# Navigate to web directory
cd /var/www

# Clone your repository
sudo git clone https://github.com/abhingram/deals247online.git deals247

# Set permissions
sudo chown -R $USER:$USER /var/www/deals247
cd /var/www/deals247
```

### Step 6: Configure Environment Variables

```bash
# Create backend .env file
nano server/.env
```

**Paste this content (update with your values):**

```env
# Server Configuration
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=deals247_db
DB_USER=deals247_user
DB_PASSWORD=YOUR_DATABASE_PASSWORD

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=https://yourdomain.com
```

Save and exit (Ctrl+X, Y, Enter)

```bash
# Create frontend .env file
nano .env.production
```

**Paste this content:**

```env
VITE_API_URL=https://yourdomain.com/api
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

Save and exit (Ctrl+X, Y, Enter)

### Step 7: Install Dependencies & Build

```bash
# Install backend dependencies
cd /var/www/deals247
npm install

# Install frontend dependencies and build
npm run build

# Verify build was created
ls -la dist/
```

### Step 8: Initialize Database Schema

```bash
# Run database setup script
cd /var/www/deals247
node server/scripts/setup-db.js

# Or manually import schema
mysql -u deals247_user -p deals247_db < server/database/schema.sql
mysql -u deals247_user -p deals247_db < server/database/business_schema.sql
mysql -u deals247_user -p deals247_db < server/database/notifications_schema.sql
```

### Step 9: Start Backend with PM2

```bash
cd /var/www/deals247

# Start the backend server
pm2 start server/index.js --name deals247-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd

# Check status
pm2 status
pm2 logs deals247-backend
```

### Step 10: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/deals247
```

**Paste this configuration (replace yourdomain.com):**

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/deals247/dist;
    }
    
    # Redirect all HTTP to HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be added by Certbot)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory for frontend
    root /var/www/deals247/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # API proxy to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security - deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

Save and exit (Ctrl+X, Y, Enter)

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/deals247 /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx to start on boot
sudo systemctl enable nginx
```

### Step 11: Configure Firewall

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

### Step 12: Setup SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose to redirect HTTP to HTTPS (option 2)

# Verify auto-renewal
sudo certbot renew --dry-run
```

### Step 13: Setup Auto-Deployment (Optional)

Create a deployment script:

```bash
nano /var/www/deals247/deploy.sh
```

**Paste this content:**

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

cd /var/www/deals247

# Pull latest changes
git pull origin main

# Install dependencies if needed
npm install

# Build frontend
npm run build

# Restart backend
pm2 restart deals247-backend

echo "✅ Deployment complete!"
```

Make it executable:

```bash
chmod +x /var/www/deals247/deploy.sh
```

### Step 14: Create Admin User (Optional)

```bash
cd /var/www/deals247

# Create admin user using your script
node server/scripts/make-admin.js your-firebase-uid
```

---

## 🔄 Regular Maintenance Commands

### Deploy Updates
```bash
cd /var/www/deals247
./deploy.sh
```

### Check Backend Logs
```bash
pm2 logs deals247-backend
pm2 logs deals247-backend --lines 100
```

### Restart Backend
```bash
pm2 restart deals247-backend
```

### Check Backend Status
```bash
pm2 status
```

### Restart Nginx
```bash
sudo systemctl restart nginx
```

### Check Nginx Status
```bash
sudo systemctl status nginx
```

### View Nginx Error Logs
```bash
sudo tail -f /var/log/nginx/error.log
```

### Database Backup
```bash
# Backup database
mysqldump -u deals247_user -p deals247_db > backup_$(date +%Y%m%d).sql

# Restore database
mysql -u deals247_user -p deals247_db < backup_20251212.sql
```

---

## 🔍 Troubleshooting

### Backend not starting
```bash
# Check logs
pm2 logs deals247-backend

# Check if port 5000 is in use
sudo lsof -i :5000

# Restart
pm2 restart deals247-backend
```

### Frontend not loading
```bash
# Check if build exists
ls -la /var/www/deals247/dist/

# Rebuild
cd /var/www/deals247
npm run build

# Check Nginx
sudo nginx -t
sudo systemctl status nginx
```

### Database connection issues
```bash
# Test MySQL connection
mysql -u deals247_user -p deals247_db

# Check MySQL status
sudo systemctl status mysql

# Restart MySQL
sudo systemctl restart mysql
```

### SSL issues
```bash
# Renew SSL certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

---

## 📊 Monitoring Setup

### Setup monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate

# Setup log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🎉 Verification Checklist

After deployment, verify:

- [ ] Website loads at https://yourdomain.com
- [ ] API responds at https://yourdomain.com/api/health
- [ ] Database connection works
- [ ] User registration/login works
- [ ] Deals are loading properly
- [ ] Images are displaying
- [ ] Backend logs show no errors: `pm2 logs`
- [ ] Nginx logs show no errors: `sudo tail /var/log/nginx/error.log`

---

## 🔐 Security Best Practices

1. **Change default passwords** for MySQL root and application database
2. **Keep system updated**: `sudo apt update && sudo apt upgrade`
3. **Regular backups**: Setup automated database backups
4. **Monitor logs**: Check PM2 and Nginx logs regularly
5. **Firewall**: Only allow necessary ports
6. **SSL**: Keep certificates renewed automatically

---

## 📞 Need Help?

Common issues and solutions:

1. **Port 5000 already in use**: Change PORT in server/.env
2. **Permission denied**: Run `sudo chown -R $USER:$USER /var/www/deals247`
3. **Module not found**: Run `npm install` in root and server directories
4. **Database connection**: Check credentials in server/.env
5. **Nginx 404**: Check if dist/ folder has files

---

## 🎯 Next Steps After Deployment

1. Point your domain DNS to VPS IP
2. Configure Firebase authorized domains
3. Setup email notifications (if applicable)
4. Configure CDN for images (optional)
5. Setup analytics and monitoring
6. Create admin user account
7. Import initial deals data

**Your application should now be live! 🚀**
