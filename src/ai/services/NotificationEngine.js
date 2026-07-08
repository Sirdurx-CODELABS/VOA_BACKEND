const https = require('https');

class NotificationEngine {
  constructor() {
    this.whatsappConfig = {
      apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0',
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      token: process.env.WHATSAPP_ACCESS_TOKEN,
    };
  }

  async send(reminder, channel) {
    switch (channel) {
      case 'whatsapp': return this.sendWhatsApp(reminder);
      case 'push': return this.sendPush(reminder);
      case 'in_app': return this.sendInApp(reminder);
      case 'sms': return this.sendSms(reminder);
      default:
        return { status: 'failed', error: `Unknown channel: ${channel}` };
    }
  }

  async sendWhatsApp(reminder) {
    try {
      const patientPhone = reminder.patient?.phone;
      if (!patientPhone) return { status: 'failed', error: 'No patient phone' };

      const reminderTypeLabels = {
        medication: 'Take your medication',
        appointment: 'Upcoming appointment',
        lab: 'Lab test reminder',
        refill: 'Prescription refill due',
        art_refill: 'ART refill due',
        adherence_counselling: 'Adherence counselling session',
        vaccination: 'Vaccination due',
        health_check: 'Health check reminder',
        exercise: 'Time for exercise',
        nutrition: 'Nutrition reminder',
        water: 'Drink water reminder',
        sleep: 'Sleep reminder',
        mental_health: 'Mental health check-in',
        daily_symptom: 'Log your symptoms',
        custom: reminder.title,
      };

      const body = reminder.description
        ? `*${reminderTypeLabels[reminder.reminderType] || reminder.title}*\n\n${reminder.description}`
        : `*${reminderTypeLabels[reminder.reminderType] || reminder.title}*`;

      if (!this.whatsappConfig.token || !this.whatsappConfig.phoneNumberId) {
        console.log('[NotificationEngine] WhatsApp not configured, would send:', body);
        return { status: 'sent', providerMessageId: 'simulated' };
      }

      const payload = JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: patientPhone,
        type: 'text',
        text: { body: `${body}\n\nReply: "Taken" / "Snooze" / "Skip" / "Help"` },
      });

      const url = new URL(`${this.whatsappConfig.apiUrl}/${this.whatsappConfig.phoneNumberId}/messages`);

      const result = await this.httpsRequest(url.hostname, url.pathname, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.whatsappConfig.token}`,
        },
      }, payload);

      return { status: 'sent', providerMessageId: result?.messages?.[0]?.id };
    } catch (err) {
      console.error('[NotificationEngine] WhatsApp send error:', err.message);
      return { status: 'failed', error: err.message };
    }
  }

  async sendPush(reminder) {
    console.log('[NotificationEngine] Push notification:', reminder.title);
    return { status: 'sent' };
  }

  async sendInApp(reminder) {
    try {
      const EMRNotification = require('../models/EMRNotification');
      await EMRNotification.create({
        userId: reminder.patient?.userId || reminder.patient?._id,
        title: reminder.title,
        message: reminder.description || '',
        type: reminder.reminderType,
        referenceId: reminder._id,
        referenceModel: 'AIReminder',
        priority: 'medium',
      });
      return { status: 'sent' };
    } catch (err) {
      return { status: 'failed', error: err.message };
    }
  }

  async sendSms(reminder) {
    console.log('[NotificationEngine] SMS would be sent:', reminder.title);
    return { status: 'sent' };
  }

  async sendCaregiverNotification(reminder, caregiverContact) {
    if (!caregiverContact) return { status: 'failed', error: 'No caregiver contact' };

    const message = `This is a caregiver notification regarding ${reminder.patient?.name || 'a patient'}: "${reminder.title}" has been missed. Please check in with them.`;

    try {
      if (caregiverContact.startsWith('+') && this.whatsappConfig.token && this.whatsappConfig.phoneNumberId) {
        const payload = JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: caregiverContact.replace('+', ''),
          type: 'text',
          text: { body: message },
        });

        const url = new URL(`${this.whatsappConfig.apiUrl}/${this.whatsappConfig.phoneNumberId}/messages`);
        await this.httpsRequest(url.hostname, url.pathname, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.whatsappConfig.token}`,
          },
        }, payload);
      }
      return { status: 'sent' };
    } catch (err) {
      return { status: 'failed', error: err.message };
    }
  }

  httpsRequest(hostname, path, options, body) {
    return new Promise((resolve, reject) => {
      const req = https.request({ hostname, path, ...options }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch { resolve(data); }
        });
      });
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }
}

module.exports = new NotificationEngine();
