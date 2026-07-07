/**
 * WhatsAppSession — Per-phone-number session state manager.
 * Tracks where the user is in each flow (registration, consent, booking, chat).
 * Sessions expire after 30 minutes of inactivity.
 */

const SESSION_TTL = 30 * 60 * 1000; // 30 min

class WhatsAppSession {
  constructor() {
    this.sessions = new Map();
    this.timeouts = new Map();
  }

  /**
   * Get or create a session for a phone number.
   */
  getOrCreate(phone) {
    let session = this.sessions.get(phone);
    if (!session) {
      session = {
        phone,
        flow: null,         // current flow name: registration, consent, hospital, consultation, chat
        step: null,         // current step within the flow
        data: {},           // accumulated data for the current flow
        patientId: null,    // resolved AIPatient ID (once registered)
        chatId: null,       // active AIChat ID
        menuMessageId: null,// last menu message ID (for replacing)
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };
      this.sessions.set(phone, session);
    }
    this.touch(phone);
    return session;
  }

  /**
   * Get an existing session (returns null if not found).
   */
  get(phone) {
    const session = this.sessions.get(phone);
    if (session) this.touch(phone);
    return session || null;
  }

  /**
   * Update the current flow state.
   */
  setFlow(phone, flow, step = null, data = {}) {
    const session = this.getOrCreate(phone);
    session.flow = flow;
    session.step = step;
    if (Object.keys(data).length) Object.assign(session.data, data);
    this.touch(phone);
    return session;
  }

  /**
   * Set just the step (within current flow).
   */
  setStep(phone, step, data = {}) {
    const session = this.getOrCreate(phone);
    session.step = step;
    if (Object.keys(data).length) Object.assign(session.data, data);
    this.touch(phone);
  }

  /**
   * Store data in the session.
   */
  setData(phone, key, value) {
    const session = this.getOrCreate(phone);
    session.data[key] = value;
    this.touch(phone);
  }

  /**
   * Clear the current flow (return to general chat).
   */
  clearFlow(phone) {
    const session = this.sessions.get(phone);
    if (session) {
      session.flow = 'chat';
      session.step = null;
      session.data = {};
      this.touch(phone);
    }
  }

  /**
   * Link this session to a patient record.
   */
  setPatient(phone, patientId) {
    const session = this.getOrCreate(phone);
    session.patientId = patientId;
    this.touch(phone);
  }

  /**
   * Refresh the expiry timeout.
   */
  touch(phone) {
    const session = this.sessions.get(phone);
    if (!session) return;
    session.lastActivity = Date.now();

    // Reset expiry timer
    if (this.timeouts.has(phone)) clearTimeout(this.timeouts.get(phone));
    this.timeouts.set(phone, setTimeout(() => {
      this.sessions.delete(phone);
      this.timeouts.delete(phone);
    }, SESSION_TTL));
  }

  /**
   * Remove a session (e.g. on flow completion).
   */
  destroy(phone) {
    this.sessions.delete(phone);
    if (this.timeouts.has(phone)) {
      clearTimeout(this.timeouts.get(phone));
      this.timeouts.delete(phone);
    }
  }

  /**
   * Get stats for monitoring.
   */
  getStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: [...this.sessions.entries()].map(([phone, s]) => ({
        phone: phone.slice(-4).padStart(phone.length, '*'),
        flow: s.flow,
        step: s.step,
        patientId: s.patientId?.toString().slice(-6) || null,
        idle: Math.round((Date.now() - s.lastActivity) / 1000) + 's',
      })),
    };
  }
}

// Singleton
module.exports = new WhatsAppSession();
