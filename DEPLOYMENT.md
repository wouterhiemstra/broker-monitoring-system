# GitHub Deployment Guide

This guide will help you deploy the Broker Monitoring System to GitHub and various hosting platforms.

## Prerequisites

- GitHub account
- Node.js 20+ installed locally
- PostgreSQL database access
- Git installed on your system

## Step 1: Repository Setup

### 1.1 Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click "New Repository" or go to https://github.com/new
3. Choose a repository name (e.g., `broker-monitoring-system`)
4. Set it to Public or Private (your choice)
5. **Do NOT** initialize with README, .gitignore, or license (we'll add these)
6. Click "Create Repository"

### 1.2 Initialize Local Repository

```bash
# In your project directory
git init
git add .
git commit -m "Initial commit: Broker monitoring system with full-stack implementation"

# Add your GitHub repository as origin
git remote add origin https://github.com/yourusername/broker-monitoring-system.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Step 2: Environment Configuration

### 2.1 Create Production Environment File

Create `.env.production` in your project root:

```bash
# Production Database (replace with your actual database URL)
DATABASE_URL="postgresql://username:password@hostname:port/database"

# Production Settings
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Session Security (generate a strong random key)
SESSION_SECRET="your-super-secure-random-session-key-change-this"

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=./uploads

# Scraping Configuration
SCRAPING_TIMEOUT=30000
SCRAPING_HEADLESS=true
SCRAPING_USER_AGENT="Mozilla/5.0 (compatible; BrokerBot/1.0)"
```

### 2.2 Update .gitignore

Ensure your `.gitignore` includes:

```
# Environment files
.env
.env.local
.env.production
.env.staging

# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
build/

# Database
*.db
*.sqlite

# Uploads
uploads/
temp/

# Logs
logs/
*.log

# Cache
.cache/
.vite/

# OS files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo
```

## Step 3: Platform-Specific Deployment

### 3.1 Replit Deployment (Recommended)

#### Option A: Import from GitHub

1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Select "Import from GitHub"
4. Enter your repository URL: `https://github.com/yourusername/broker-monitoring-system`
5. Click "Import from GitHub"

#### Option B: Connect Existing Repl

1. In your existing Repl, go to Tools → Git
2. Click "Connect to GitHub"
3. Follow the authentication process
4. Push your code to the connected repository

#### Configuration in Replit:

1. **Add Database**: 
   - Go to Tools → Database
   - Add PostgreSQL database
   - Copy the connection string

2. **Set Environment Secrets**:
   - Go to Tools → Secrets
   - Add the following secrets:
     ```
     DATABASE_URL: your_postgresql_connection_string
     SESSION_SECRET: your_secure_random_key
     NODE_ENV: production
     ```

3. **Configure Run Command**:
   - Your `.replit` file should contain:
     ```
     run = "npm run dev"
     ```

4. **Deploy**:
   - Click the "Deploy" button in Replit
   - Choose "Autoscale" for production
   - Your app will be available at: `https://your-repl-name.yourusername.repl.co`

### 3.2 Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Configure Vercel**:
   Create `vercel.json` in your project root:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server/index.ts",
         "use": "@vercel/node"
       },
       {
         "src": "client/**/*",
         "use": "@vercel/static-build"
       }
     ],
     "routes": [
       {
         "src": "/api/(.*)",
         "dest": "/server/index.ts"
       },
       {
         "src": "/(.*)",
         "dest": "/client/$1"
       }
     ],
     "env": {
       "NODE_ENV": "production"
     }
   }
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Add Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`

### 3.3 Railway Deployment

1. **Connect to Railway**:
   - Go to [Railway](https://railway.app)
   - Connect your GitHub account
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository

2. **Add Database**:
   - In Railway dashboard, click "Add Plugin"
   - Select "PostgreSQL"
   - Copy the connection URL

3. **Set Environment Variables**:
   - Go to your project → Variables
   - Add: `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV=production`

4. **Configure Build**:
   - Railway will auto-detect your Node.js app
   - Build command: `npm run build`
   - Start command: `npm start`

### 3.4 Render Deployment

1. **Create Render Account**:
   - Go to [Render](https://render.com)
   - Connect your GitHub account

2. **Create Web Service**:
   - Click "New" → "Web Service"
   - Connect your repository
   - Configure:
     - Build Command: `npm install && npm run build`
     - Start Command: `npm start`
     - Node Version: 20

3. **Add Database**:
   - Create a new PostgreSQL database in Render
   - Copy the connection string

4. **Set Environment Variables**:
   - In your web service settings, add:
     - `DATABASE_URL`: your_postgresql_connection_string
     - `SESSION_SECRET`: your_secure_key
     - `NODE_ENV`: production

## Step 4: Database Setup

### 4.1 Initialize Production Database

After deployment, initialize your database:

```bash
# Run migrations
npm run db:push

# Seed initial data
npm run db:seed
```

### 4.2 Verify Database Connection

Test your database connection by accessing:
- `https://yourapp.com/api/brokers` - Should return empty array initially
- `https://yourapp.com/api/kpis` - Should return dashboard data

## Step 5: Domain Configuration (Optional)

### 5.1 Custom Domain Setup

Most platforms support custom domains:

1. **Purchase Domain** (e.g., from Namecheap, GoDaddy)
2. **Configure DNS**:
   - Add CNAME record pointing to your platform's URL
   - Example: `CNAME www.yourbrokerapp.com your-app.platform.com`
3. **Update Platform Settings**:
   - Add custom domain in your hosting platform settings
   - Enable SSL certificate (usually automatic)

### 5.2 SSL Certificate

Most platforms provide automatic SSL certificates. Verify by:
- Checking for HTTPS in your browser
- Looking for the lock icon in the address bar

## Step 6: Monitoring and Maintenance

### 6.1 Set Up Monitoring

1. **Error Tracking**: Consider adding Sentry or similar service
2. **Uptime Monitoring**: Use services like UptimeRobot
3. **Performance Monitoring**: Use platform-specific tools

### 6.2 Backup Strategy

1. **Database Backups**: Most platforms offer automated backups
2. **Code Backups**: Maintained automatically through Git
3. **File Uploads**: Consider cloud storage (S3, Cloudinary)

### 6.3 Security Checklist

- [ ] Strong SESSION_SECRET in production
- [ ] Database password is secure
- [ ] Environment variables are not exposed
- [ ] File upload restrictions are in place
- [ ] Rate limiting is configured (if needed)
- [ ] HTTPS is enabled
- [ ] Default admin password is changed

## Step 7: Testing Deployment

### 7.1 Functional Testing

Test all major features:
- [ ] Login/authentication works
- [ ] Dashboard loads with correct data
- [ ] Broker configuration can be added/edited
- [ ] Listings can be created and managed
- [ ] Scraping can be triggered manually
- [ ] File uploads work correctly
- [ ] Status updates work properly

### 7.2 Performance Testing

- [ ] Page load times are acceptable
- [ ] Database queries are optimized
- [ ] File uploads complete without timeout
- [ ] Scraping operations run without errors

## Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify DATABASE_URL is correct
   - Check database server is accessible
   - Ensure database exists and has proper permissions

2. **Build Failures**:
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Review build logs for specific errors

3. **Runtime Errors**:
   - Check environment variables are set
   - Review application logs
   - Verify file permissions for uploads directory

4. **Scraping Issues**:
   - Check if platform supports Puppeteer
   - Verify user agent strings are appropriate
   - Consider headless browser limitations

### Getting Help

- Check platform-specific documentation
- Review application logs for detailed error messages
- Create issues in your GitHub repository
- Consult platform support channels

## Next Steps

After successful deployment:

1. **Change default admin password**
2. **Configure broker settings for your target sites**
3. **Set up automated scraping schedules**
4. **Add team members if needed**
5. **Configure notification settings**
6. **Set up regular database backups**

Your Broker Monitoring System is now live and ready to help automate your lead generation process!