// ===================================================================
// VONAGE OUTBOUND OTP CALL SYSTEM - MAIN SERVER
// ===================================================================

const express = require('express');
const cors = require('cors');
const { Vonage } = require('@vonage/server-sdk');
const Database = require('./database');
const DeepgramService = require('./deepgram-service');
const WebSocketHandler = require('./websocket-handler');
const VonageService = require('./vonage-service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('frontend'));

// Initialize services
const db = new Database();
const deepgram = new DeepgramService();
const wsHandler = new WebSocketHandler();
const vonageService = new VonageService();

// Initialize Vonage client
const vonage = new Vonage({
  apiKey: process.env.VONAGE_API_KEY,
  apiSecret: process.env.VONAGE_API_SECRET,
  applicationId: process.env.VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_PRIVATE_KEY?.replace(/\\n/g, '\n')
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      database: db.isHealthy(),
      deepgram: !!process.env.DEEPGRAM_API_KEY,
      vonage: !!(process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET)
    }
  });
});

// Trigger outbound call
app.post('/api/calls/trigger', async (req, res) => {
  try {
    const { phoneNumber, otpCode, language = 'en-US', transferNumber } = req.body;

    if (!phoneNumber || !otpCode) {
      return res.status(400).json({ 
        error: 'Missing required fields: phoneNumber and otpCode' 
      });
    }

    console.log(`🚀 Triggering call to ${phoneNumber} with OTP: ${otpCode}`);

    const callId = await db.createCall({
      phoneNumber,
      otpCode,
      language,
      transferNumber,
      status: 'initiated'
    });

    const vonageCallId = await vonageService.makeOutboundCall(
      vonage,
      phoneNumber,
      otpCode,
      language,
      transferNumber,
      callId
    );

    await db.updateCall(callId, { vonageCallId, status: 'ringing' });

    wsHandler.broadcast({
      type: 'call_initiated',
      callId,
      phoneNumber,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      callId,
      vonageCallId,
      message: 'Call initiated successfully'
    });

  } catch (error) {
    console.error('❌ Call trigger error:', error);
    res.status(500).json({ 
      error: 'Failed to initiate call',
      details: error.message 
    });
  }
});

// Answer webhook
app.get('/webhooks/answer', async (req, res) => {
  try {
    const callId = req.query.callId;
    const call = await db.getCallById(callId);

    if (!call) {
      return res.json([{ action: 'talk', text: 'Call not found.' }]);
    }

    console.log(`📞 Call answered: ${call.phoneNumber}`);

    await db.updateCall(callId, { 
      status: 'answered', 
      answeredAt: new Date().toISOString() 
    });

    wsHandler.broadcast({
      type: 'call_answered',
      callId,
      phoneNumber: call.phoneNumber,
      timestamp: new Date().toISOString()
    });

    const ncco = vonageService.generateAnswerNCCO(call);
    res.json(ncco);

  } catch (error) {
    console.error('❌ Answer webhook error:', error);
    res.json([{ 
      action: 'talk', 
      text: 'An error occurred.' 
    }]);
  }
});

// Event webhook
app.post('/webhooks/event', async (req, res) => {
  try {
    const event = req.body;
    console.log('📊 Call event:', event.status);

    const callId = event.uuid;

    switch (event.status) {
      case 'started':
        await db.updateCallByVonageId(callId, { status: 'in_progress' });
        break;
      case 'answered':
        await db.updateCallByVonageId(callId, { 
          status: 'answered',
          answeredAt: new Date().toISOString() 
        });
        break;
      case 'completed':
        await db.updateCallByVonageId(callId, {
          status: 'completed',
          endedAt: new Date().toISOString(),
          duration: event.duration
        });
        break;
      case 'failed':
      case 'rejected':
      case 'unanswered':
      case 'busy':
        await db.updateCallByVonageId(callId, {
          status: event.status,
          endedAt: new Date().toISOString()
        });
        break;
    }

    wsHandler.broadcast({
      type: 'call_event',
      event: event.status,
      callId,
      timestamp: new Date().toISOString()
    });

    res.sendStatus(200);

  } catch (error) {
    console.error('❌ Event webhook error:', error);
    res.sendStatus(200);
  }
});

// DTMF webhook
app.post('/webhooks/dtmf', async (req, res) => {
  try {
    const { dtmf, uuid, callId } = req.body;
    
    console.log(`🔢 DTMF received: ${dtmf}`);

    const call = await db.getCallByVonageId(uuid) || await db.getCallById(callId);

    if (!call) {
      return res.json([{ action: 'talk', text: 'Call not found.' }]);
    }

    await db.updateCall(call.id, { 
      dtmfInput: dtmf,
      dtmfReceivedAt: new Date().toISOString()
    });

    const isValid = dtmf === call.otpCode;
    await db.updateCall(call.id, { 
      verified: isValid,
      verifiedAt: new Date().toISOString()
    });

    wsHandler.broadcast({
      type: 'dtmf_received',
      callId: call.id,
      dtmf,
      isValid,
      timestamp: new Date().toISOString()
    });

    const ncco = isValid 
      ? vonageService.generateSuccessNCCO(call)
      : vonageService.generateFailureNCCO(call);

    res.json(ncco);

  } catch (error) {
    console.error('❌ DTMF webhook error:', error);
    res.json([{ action: 'talk', text: 'An error occurred.' }]);
  }
});

// API routes
app.get('/api/calls', async (req, res) => {
  try {
    const calls = await db.getAllCalls();
    res.json(calls);
  } catch (error) {
    console.error('❌ Get calls error:', error);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

app.get('/api/calls/:id', async (req, res) => {
  try {
    const call = await db.getCallById(req.params.id);
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    const transcripts = await db.getTranscripts(req.params.id);
    res.json({ ...call, transcripts });
  } catch (error) {
    console.error('❌ Get call error:', error);
    res.status(500).json({ error: 'Failed to fetch call' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    const stats = await db.getStats();
    res.json(stats);
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Initialize WebSocket
wsHandler.initialize(app);

// Start server
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 VONAGE OUTBOUND OTP SYSTEM');
  console.log('='.repeat(60));
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log('='.repeat(60) + '\n');
  
  db.initialize();
  console.log('✅ Database initialized\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('⚠️  Shutting down...');
  server.close(() => {
    db.close();
    process.exit(0);
  });
});

module.exports = app;
