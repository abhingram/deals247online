#!/usr/bin/env node

/**
 * Deals247 Production Deployment Script
 * Supports multiple hosting platforms
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const platforms = {
  vercel: {
    name: 'Vercel',
    command: 'npx vercel --prod',
    install: 'npm install -g vercel'
  },
  netlify: {
    name: 'Netlify',
    command: 'npx netlify-cli deploy --prod --dir=dist',
    install: 'npm install -g netlify-cli'
  },
  railway: {
    name: 'Railway',
    command: 'npx @railway/cli@latest deploy',
    install: 'npm install -g @railway/cli@latest'
  },
  surge: {
    name: 'Surge',
    command: 'npx surge dist --domain deals247.surge.sh',
    install: 'npm install -g surge'
  },
  hostinger: {
    name: 'Hostinger',
    manual: true
  }
};

function checkBuildExists() {
  const distPath = path.join(process.cwd(), 'dist');
  if (!fs.existsSync(distPath)) {
    console.error('❌ No build found! Run "npm run build" first.');
    process.exit(1);
  }
  console.log('✅ Build found in dist/ directory');
}

function deploy(platform) {
  const config = platforms[platform];
  if (!config) {
    console.error(`❌ Unknown platform: ${platform}`);
    console.log('Available platforms:', Object.keys(platforms).join(', '));
    process.exit(1);
  }

  console.log(`🚀 Deploying to ${config.name}...`);

  // Handle manual deployments
  if (config.manual) {
    showManualInstructions(platform);
    return;
  }

  try {
    // Try to install CLI if needed
    try {
      execSync(config.install, { stdio: 'inherit' });
    } catch (e) {
      console.log(`⚠️  Could not install ${config.name} CLI, trying direct command...`);
    }

    // Run deployment
    execSync(config.command, { stdio: 'inherit' });
    console.log(`✅ Successfully deployed to ${config.name}!`);
  } catch (error) {
    console.error(`❌ Deployment to ${config.name} failed:`, error.message);
    process.exit(1);
  }
}

function showManualInstructions(platform) {
  if (platform === 'hostinger') {
    console.log(`
📋 Hostinger Deployment Instructions

Your build is ready in the 'dist/' folder. Follow these steps:

1. 📁 Access your Hostinger File Manager:
   - Log in to your Hostinger account
   - Go to "Files" → "File Manager"
   - Navigate to public_html (or your domain's root folder)

2. 📤 Upload Files:
   - Upload all files from your local 'dist/' folder
   - Make sure to upload the entire contents, not just the folder

3. 🔧 Configure SPA Routing (Important!):
   - Create a .htaccess file in your public_html directory with this content:

     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]

4. 🌐 Set Environment Variables:
   - If you need environment variables, create a .env file or set them in your hosting control panel

5. 🚀 Your site should be live at your domain!

Need help? Check Hostinger's documentation for React app deployment.

✅ Build files are ready in: ${path.join(process.cwd(), 'dist')}
    `);
  }
}

function showHelp() {
  console.log(`
🎯 Deals247 Deployment Script

Usage: node deploy.js <platform>

Available platforms:
  vercel     - Deploy to Vercel
  netlify    - Deploy to Netlify
  railway    - Deploy to Railway
  surge      - Deploy to Surge.sh
  hostinger  - Manual deployment to Hostinger

Examples:
  node deploy.js vercel
  node deploy.js hostinger

Make sure to run "npm run build" first!
  `);
}

// Main execution
const args = process.argv.slice(2);
const platform = args[0];

if (!platform || platform === '--help' || platform === '-h') {
  showHelp();
  process.exit(0);
}

checkBuildExists();
deploy(platform);