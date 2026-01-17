// ===================================================================
// VONAGE SERVICE - Call Management
// ===================================================================

class VonageService {
  
  async makeOutboundCall(vonage, phoneNumber, otpCode, language, transferNumber, callId) {
    try {
      const webhookUrl = process.env.WEBHOOK_BASE_URL || process.env.RAILWAY_PUBLIC_DOMAIN 
        ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
        : 'https://your-app.railway.app';

      console.log(`📞 Calling ${phoneNumber}`);

      const result = await vonage.voice.createOutboundCall({
        to: [{ type: 'phone', number: phoneNumber }],
        from: { type: 'phone', number: process.env.VONAGE_PHONE_NUMBER },
        answer_url: [`${webhookUrl}/webhooks/answer?callId=${callId}`],
        event_url: [`${webhookUrl}/webhooks/event`]
      });

      console.log('✅ Call initiated:', result.uuid);
      return result.uuid;

    } catch (error) {
      console.error('❌ Call error:', error);
      throw new Error(`Failed: ${error.message}`);
    }
  }

  generateAnswerNCCO(call) {
    const { otpCode, language } = call;

    const greetings = {
      'en-US': `Hello! Your verification code is: ${this.spellOutDigits(otpCode)}. Please press the digits to verify.`,
      'es-ES': `¡Hola! Su código es: ${this.spellOutDigits(otpCode)}. Presione los dígitos.`,
      'fr-FR': `Bonjour! Votre code est: ${this.spellOutDigits(otpCode)}. Appuyez sur les chiffres.`,
      'de-DE': `Hallo! Ihr Code lautet: ${this.spellOutDigits(otpCode)}. Drücken Sie die Ziffern.`
    };

    const greeting = greetings[language] || greetings['en-US'];

    const webhookUrl = process.env.WEBHOOK_BASE_URL || 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');

    return [
      {
        action: 'talk',
        text: greeting,
        language: language || 'en-US',
        style: 1
      },
      {
        action: 'input',
        type: ['dtmf'],
        dtmf: {
          maxDigits: otpCode.length,
          timeOut: 10,
          submitOnHash: true
        },
        eventUrl: [`${webhookUrl}/webhooks/dtmf?callId=${call.id}`],
        eventMethod: 'POST'
      }
    ];
  }

  generateSuccessNCCO(call) {
    const { language, transferNumber } = call;

    const messages = {
      'en-US': 'Thank you! Your code is verified.',
      'es-ES': '¡Gracias! Su código está verificado.',
      'fr-FR': 'Merci! Votre code est vérifié.',
      'de-DE': 'Vielen Dank! Ihr Code ist verifiziert.'
    };

    return [
      {
        action: 'talk',
        text: messages[language] || messages['en-US'],
        language: language || 'en-US',
        style: 1
      }
    ];
  }

  generateFailureNCCO(call) {
    const { otpCode, language } = call;

    const messages = {
      'en-US': `Sorry, incorrect. Your code is: ${this.spellOutDigits(otpCode)}. Try again.`,
      'es-ES': `Lo siento, incorrecto. Su código es: ${this.spellOutDigits(otpCode)}.`,
      'fr-FR': `Désolé, incorrect. Votre code est: ${this.spellOutDigits(otpCode)}.`,
      'de-DE': `Entschuldigung, falsch. Ihr Code: ${this.spellOutDigits(otpCode)}.`
    };

    const webhookUrl = process.env.WEBHOOK_BASE_URL || 
      (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '');

    return [
      {
        action: 'talk',
        text: messages[language] || messages['en-US'],
        language: language || 'en-US',
        style: 1
      },
      {
        action: 'input',
        type: ['dtmf'],
        dtmf: {
          maxDigits: call.otpCode.length,
          timeOut: 10,
          submitOnHash: true
        },
        eventUrl: [`${webhookUrl}/webhooks/dtmf?callId=${call.id}`],
        eventMethod: 'POST'
      }
    ];
  }

  spellOutDigits(code) {
    return code.split('').join(', ');
  }
}

module.exports = VonageService;
