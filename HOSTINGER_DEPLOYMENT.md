# 🚀 Hostinger VPS Deployment Instructions - Deals247

## 📋 Your Configuration Summary

- **Domain**: deals247.online
- **VPS Access**: root@YOUR_VPS_IP (port 22)
- **Database**: Hostinger Remote MySQL (srv994.hstgr.io)
- **SSL**: Will be configured with Let's Encrypt
- **Backend Port**: 5000
- **Repository**: https://github.com/abhingram/deals247online

---

## ⚠️ IMPORTANT: Before You Start

### 1. Get Your VPS IP Address
Log into Hostinger control panel and find your VPS IP address. You'll need this for:
- SSH connection
- DNS configuration

### 2. Point Your Domain DNS to VPS IP
In your domain registrar (where you bought deals247.online):
1. Go to DNS settings
2. Add/Update these records:
   ```
   Type: A
   Name: @
   Value: YOUR_VPS_IP
   TTL: 300

   Type: A
   Name: www
   Value: YOUR_VPS_IP
   TTL: 300
   ```
3. Wait 5-10 minutes for DNS propagation

### 3. Verify DNS is Working
```bash
ping deals247.online
```
Should show your VPS IP address

---

## 🎯 Deployment Steps

### Step 1: Connect to Your VPS

Open PowerShell and connect via SSH:

```powershell
ssh root@YOUR_VPS_IP
```

When prompted:
- Type `yes` to accept fingerprint
- Enter your root password

### Step 2: Download and Run Deployment Script

Once connected to your VPS, run these commands:

```bash
# Download the deployment script
cd ~
curl -o deploy-vps.sh https://raw.githubusercontent.com/abhingram/deals247online/main/deploy-vps.sh

# Make it executable
chmod +x deploy-vps.sh

# Run the deployment
./deploy-vps.sh
```

The script will automatically:
- ✅ Install Node.js, Nginx, PM2
- ✅ Clone your application
- ✅ Configure environment variables
- ✅ Build the frontend
- ✅ Setup database tables
- ✅ Start the backend with PM2
- ✅ Configure Nginx reverse proxy
- ✅ Setup firewall
- ✅ Install SSL certificate

**The entire process takes about 5-10 minutes.**

---

## 🔧 Manual Deployment (If Script Fails)

If the automated script has issues, follow these manual steps:

### 1. Update System
```bash
ssh root@YOUR_VPS_IP
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js 20.x
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v20.x
```

### 3. Install Required Software
```bash
sudo apt install -y nginx git build-essential mysql-client
sudo npm install -g pm2
```

### 4. Clone Application
```bash
cd /var/www
sudo git clone https://github.com/abhingram/deals247online.git deals247
sudo chown -R $USER:$USER /var/www/deals247
cd /var/www/deals247
```

### 5. Configure Backend Environment
```bash
nano server/.env
```

Paste this content:
```env
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://deals247.online

DB_HOST=srv994.hstgr.io
DB_PORT=3306
DB_NAME=u515501238_deals247_db
DB_USER=u515501238_deals247_user
DB_PASSWORD=2ap5HYzh5@R8&Cq

JWT_SECRET=deals247-jwt-secret-key-production-2025
JWT_EXPIRES_IN=7d

CORS_ORIGIN=https://deals247.online,http://deals247.online
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 6. Build Application
```bash
cd /var/www/deals247
npm install
npm run build
```

### 7. Setup Database
```bash
mysql -h srv994.hstgr.io -u u515501238_deals247_user -p'2ap5HYzh5@R8&Cq' u515501238_deals247_db < server/database/schema.sql
mysql -h srv994.hstgr.io -u u515501238_deals247_user -p'2ap5HYzh5@R8&Cq' u515501238_deals247_db < server/database/business_schema.sql
mysql -h srv994.hstgr.io -u u515501238_deals247_user -p'2ap5HYzh5@R8&Cq' u515501238_deals247_db < server/database/notifications_schema.sql
```

### 8. Start Backend with PM2
```bash
cd /var/www/deals247
pm2 start server/index.js --name deals247-backend
pm2 save
pm2 startup
```

### 9. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/deals247
```

Paste the Nginx configuration (see deploy-vps.sh for full config), then:
```bash
sudo ln -s /etc/nginx/sites-available/deals247 /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 10. Setup Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 11. Install SSL Certificate
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d deals247.online -d www.deals247.online
```

---

## ✅ Verification Steps

After deployment, verify everything works:

### 1. Check Backend is Running
```bash
pm2 status
pm2 logs deals247-backend --lines 20
```

### 2. Test Backend API
```bash
curl http://localhost:5000/api/health
```

Should return: `{"status":"ok","message":"Deals247 API is running"}`

### 3. Check Nginx Status
```bash
sudo systemctl status nginx
```

### 4. Test Website
Open browser and visit:
- http://deals247.online
- https://deals247.online

### 5. Test API Endpoint
```bash
curl https://deals247.online/api/health
```

---

## 🔄 Update/Redeploy Application

When you push changes to GitHub, run this on your VPS:

```bash
cd /var/www/deals247
git pull origin main
npm install
npm run build
pm2 restart deals247-backend
```

Or create an update script:
```bash
nano /var/www/deals247/update.sh
```

Content:
```bash
#!/bin/bash
cd /var/www/deals247
git pull origin main
npm install
npm run build
pm2 restart deals247-backend
echo "✅ Application updated!"
```

Make executable and use:
```bash
chmod +x /var/www/deals247/update.sh
/var/www/deals247/update.sh
```

---

## 🔍 Troubleshooting

### Backend Not Starting
```bash
pm2 logs deals247-backend
pm2 restart deals247-backend
```

### Website Shows 502 Bad Gateway
```bash
# Check if backend is running
pm2 status

# Check if port 5000 is listening
sudo lsof -i :5000

# Restart services
pm2 restart deals247-backend
sudo systemctl restart nginx
```

### Database Connection Failed
```bash
# Test database connection
mysql -h srv994.hstgr.io -u u515501238_deals247_user -p'2ap5HYzh5@R8&Cq' u515501238_deals247_db -e "SELECT 1;"

# Check server/.env file
cat /var/www/deals247/server/.env
```

### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx config
sudo nginx -t
```

### Frontend Not Loading
```bash
# Check if build exists
ls -la /var/www/deals247/dist/

# Rebuild
cd /var/www/deals247
npm run build

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 Monitoring Commands

### View Backend Logs
```bash
pm2 logs deals247-backend
pm2 logs deals247-backend --lines 100
```

### Monitor System Resources
```bash
pm2 monit
htop
```

### Check Nginx Logs
```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

### Database Queries
```bash
mysql -h srv994.hstgr.io -u u515501238_deals247_user -p'2ap5HYzh5@R8&Cq' u515501238_deals247_db
```

---

## 🎯 Post-Deployment Tasks

### 1. Add Domain to Firebase
1. Go to Firebase Console
2. Navigate to Authentication → Settings → Authorized Domains
3. Add `deals247.online`

### 2. Create Admin User
```bash
cd /var/www/deals247
node server/scripts/make-admin.js YOUR_FIREBASE_UID
```

### 3. Test All Features
- ✅ User registration
- ✅ User login
- ✅ Browse deals
- ✅ Search functionality
- ✅ Filter sidebar
- ✅ Deal details
- ✅ Save to favorites
- ✅ Admin panel (if admin)

### 4. Setup Monitoring (Optional)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🆘 Need Help?

### Common Issues

1. **Can't connect via SSH**
   - Verify VPS IP is correct
   - Check Hostinger firewall allows SSH (port 22)

2. **Domain not working**
   - Wait for DNS propagation (up to 24 hours)
   - Verify A records are correct
   - Use `dig deals247.online` to check DNS

3. **SSL certificate failed**
   - Make sure DNS is propagated first
   - Check domain is accessible via HTTP first
   - Run: `sudo certbot --nginx -d deals247.online -d www.deals247.online`

4. **Backend crashes**
   - Check logs: `pm2 logs deals247-backend`
   - Verify database connection
   - Check environment variables in `server/.env`

---

## 📞 Support Resources

- **PM2 Documentation**: https://pm2.keymetrics.io/
- **Nginx Documentation**: https://nginx.org/en/docs/
- **Let's Encrypt**: https://letsencrypt.org/
- **Node.js**: https://nodejs.org/

---

## 🎉 Success Checklist

- [ ] SSH connection successful
- [ ] Domain DNS pointed to VPS IP
- [ ] Deployment script completed without errors
- [ ] Backend is running (`pm2 status` shows "online")
- [ ] Website loads at https://deals247.online
- [ ] API responds at https://deals247.online/api/health
- [ ] SSL certificate installed (HTTPS works)
- [ ] Firebase domain authorized
- [ ] User can register/login
- [ ] Deals are displaying correctly

**Congratulations! Your Deals247 application is live! 🚀**
