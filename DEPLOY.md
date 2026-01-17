# 🚀 DEPLOYMENT GUIDE

## Step 1: Push to GitHub

```bash
cd vonage-outbound-otp
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/vonage-outbound-otp.git
git push -u origin main
```

## Step 2: Deploy on Railway

1. Go to https://railway.app/new
2. Click "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect configuration

## Step 3: Add Environment Variables

In Railway Variables tab:

```
VONAGE_API_KEY=your_key
VONAGE_API_SECRET=your_secret
VONAGE_APPLICATION_ID=your_app_id
VONAGE_PHONE_NUMBER=+1234567890
VONAGE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
DEEPGRAM_API_KEY=your_key (optional)
```

## Step 4: Update Vonage Webhooks

In Vonage Dashboard:

- Answer URL: `https://your-app.railway.app/webhooks/answer`
- Event URL: `https://your-app.railway.app/webhooks/event`

## Step 5: Test

Visit: `https://your-app.railway.app`

Trigger a test call!

## Troubleshooting

```bash
# View logs
railway logs

# Check health
curl https://your-app.railway.app/health
```
