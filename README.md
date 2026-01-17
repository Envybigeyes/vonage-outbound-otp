# 🚀 Vonage Outbound OTP Call System

Complete production-ready outbound OTP verification system.

## Features

✅ Outbound OTP calls
✅ Real-time dashboard
✅ Multi-language support (EN, ES, FR, DE)
✅ DTMF verification
✅ Call transfer capability
✅ Live transcription (Deepgram)
✅ SQLite database
✅ WebSocket monitoring

## Quick Start

### 1. Get Credentials

- **Vonage**: https://dashboard.nexmo.com/
- **Deepgram** (optional): https://console.deepgram.com/
- **Railway**: https://railway.app/

### 2. Deploy to Railway

1. Push to GitHub
2. Connect Railway to your repo
3. Add environment variables:
   - VONAGE_API_KEY
   - VONAGE_API_SECRET
   - VONAGE_APPLICATION_ID
   - VONAGE_PHONE_NUMBER
   - VONAGE_PRIVATE_KEY
   - DEEPGRAM_API_KEY (optional)

### 3. Update Vonage Webhooks

- Answer URL: `https://your-app.railway.app/webhooks/answer`
- Event URL: `https://your-app.railway.app/webhooks/event`

### 4. Test!

Visit your Railway URL and trigger a test call.

## Cost

- Railway: FREE (500 hours/month)
- Deepgram: FREE ($200 credit)
- Vonage: ~$0.01-0.02 per call

## Documentation

All configuration details are in the code comments.

## Support

Check Railway logs: `railway logs`

Built with ❤️
