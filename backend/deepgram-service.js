// ===================================================================
// DEEPGRAM SERVICE - Real-time Speech-to-Text
// ===================================================================

const { createClient } = require('@deepgram/sdk');

class DeepgramService {
  constructor() {
    this.apiKey = process.env.DEEPGRAM_API_KEY;
    this.client = null;
    this.connections = new Map();

    if (this.apiKey) {
      this.client = createClient(this.apiKey);
      console.log('✅ Deepgram initialized');
    } else {
      console.warn('⚠️  Deepgram disabled - no API key');
    }
  }

  async startTranscription(callId, onTranscript) {
    if (!this.client) return null;

    try {
      const connection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        interim_results: false,
        encoding: 'linear16',
        sample_rate: 16000,
        channels: 1
      });

      connection.on('Results', (data) => {
        const transcript = data.channel.alternatives[0]?.transcript;
        const confidence = data.channel.alternatives[0]?.confidence;

        if (transcript && transcript.trim()) {
          console.log(`📝 Transcript: ${transcript}`);
          onTranscript(transcript, confidence);
        }
      });

      connection.on('error', (error) => {
        console.error('❌ Deepgram error:', error);
      });

      connection.on('close', () => {
        this.connections.delete(callId);
      });

      this.connections.set(callId, connection);
      return connection;

    } catch (error) {
      console.error('❌ Transcription start error:', error);
      return null;
    }
  }

  sendAudio(callId, audioData) {
    const connection = this.connections.get(callId);
    if (connection) {
      try {
        connection.send(audioData);
      } catch (error) {
        console.error('❌ Audio send error:', error);
      }
    }
  }

  stopTranscription(callId) {
    const connection = this.connections.get(callId);
    if (connection) {
      try {
        connection.finish();
        this.connections.delete(callId);
      } catch (error) {
        console.error('❌ Stop error:', error);
      }
    }
  }

  cleanup() {
    for (const [callId, connection] of this.connections) {
      try {
        connection.finish();
      } catch (error) {
        console.error('❌ Cleanup error:', error);
      }
    }
    this.connections.clear();
  }
}

module.exports = DeepgramService;
