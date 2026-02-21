# VPS Deployment Guide (Oracle Cloud / Ubuntu)

This guide helps you deploy the QR Chat application on a Virtual Private Server (VPS) like Oracle Cloud Free Tier. It follows the "Reverse Proxy" architecture for better security and standard port usage (80/443).

## Prerequisites
- An Oracle Cloud account and a created Ubuntu VPS instance.
- SSH access to your VPS.
- Domain name (optional, but recommended).

## Step 1: Prepare the Server
Update your system and install necessary tools:
```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

## Step 2: Database Setup (MySQL)
Install and configure MySQL:
```bash
sudo apt install mysql-server -y
sudo mysql_secure_installation
sudo mysql
```
Inside MySQL prompt:
```sql
CREATE DATABASE chate;
CREATE USER 'chate_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON chate.* TO 'chate_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## Step 3: Deploy Backend
Clone the repository and install dependencies:
```bash
git clone https://github.com/SanthoshK-2/QRChat.git
cd QRChat
npm install
cd server && npm install
cd ..
```

Update `.env` file in `server/.env` with your database credentials:
```bash
nano server/.env
# DB_USER=chate_user
# DB_PASSWORD=your_password
# DB_NAME=chate
# PORT=5001
```

Start the backend with PM2 using the provided config:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 4: Deploy Frontend
Build the frontend and move it to Nginx directory:
```bash
cd client
npm install
npm run build
sudo mkdir -p /var/www/html/build
sudo cp -r dist/* /var/www/html/build/
```

## Step 5: Configure Nginx
Use the provided `nginx.conf.example` as a template:
```bash
sudo nano /etc/nginx/sites-available/default
# Copy content from nginx.conf.example here
```
Test and restart Nginx:
```bash
sudo nginx -t
sudo systemctl restart nginx
```

## Step 6: Configure Firewall (Oracle Cloud)
Go to your Oracle Cloud Dashboard -> Networking -> Security Lists -> Inbound Rules.
Add the following rules:
- **Source CIDR:** 0.0.0.0/0
- **IP Protocol:** TCP
- **Destination Port Range:** 80, 443
- *(Optional)* **Destination Port Range:** 5001 (If you need direct backend access for debugging)

## Step 7: Enable HTTPS (Free SSL)
Secure your site with a free SSL certificate using Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx
```
Follow the prompts to select your domain and redirect HTTP to HTTPS.

## Step 8: Final Verification
Your application is now live at `https://your-domain.com` (or `http://YOUR_VPS_IP` if no domain).
- The frontend connects automatically via the Nginx proxy (`/api` and `/socket.io`).
- No manual code changes are needed for the IP address in `client/src/config.js` because it uses `window.location.origin` automatically.
