const AIReminder = require('../models/AIReminder');
const NotificationEngine = require('./NotificationEngine');

class ReminderScheduler {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.checkIntervalMs = 60 * 1000; // 1 minute
  }

  start() {
    if (this.isRunning) return;

    this.processDueReminders();
    this.interval = setInterval(() => this.processDueReminders(), this.checkIntervalMs);

    this.isRunning = true;
    console.log('[ReminderScheduler] Started — checking every minute');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      this.isRunning = false;
      console.log('[ReminderScheduler] Stopped');
    }
  }

  async processDueReminders() {
    try {
      const now = new Date();

      const dueReminders = await AIReminder.find({
        status: { $in: ['pending', 'sent'] },
        nextScheduledAt: { $lte: now },
      }).populate('patient').limit(50);

      for (const reminder of dueReminders) {
        await this.sendReminder(reminder);
      }
    } catch (err) {
      console.error('[ReminderScheduler] Error processing reminders:', err.message);
    }

    // Also process snoozed reminders where snoozedUntil has passed
    try {
      const now = new Date();
      const snoozedDue = await AIReminder.find({
        status: 'snoozed',
        snoozedUntil: { $lte: now },
      }).populate('patient').limit(50);

      for (const reminder of snoozedDue) {
        reminder.status = 'pending';
        reminder.snoozedUntil = null;
        await reminder.save();
        await this.sendReminder(reminder);
      }
    } catch (err) {
      console.error('[ReminderScheduler] Error processing snoozed:', err.message);
    }
  }

  async sendReminder(reminder) {
    const channels = reminder.channels?.length ? reminder.channels : ['in_app'];

    const results = [];
    for (const channel of channels) {
      const result = await NotificationEngine.send(reminder, channel);
      results.push({ channel, ...result });

      reminder.notificationLogs.push({
        channel,
        status: result.status,
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
        error: result.error,
      });
    }

    reminder.status = 'sent';
    reminder.lastNotifiedAt = new Date();

    // Set next occurrence for recurring reminders
    if (reminder.recurrence.type !== 'none') {
      const nextDate = this.calculateNextOccurrence(reminder);
      if (nextDate && (!reminder.recurrence.endDate || nextDate <= reminder.recurrence.endDate)) {
        reminder.nextScheduledAt = nextDate;
        reminder.status = 'pending';
      } else {
        reminder.status = 'expired';
      }
    }

    await reminder.save();
    return results;
  }

  calculateNextOccurrence(reminder) {
    const lastTime = reminder.nextScheduledAt || reminder.scheduledTime;
    const next = new Date(lastTime);

    switch (reminder.recurrence.type) {
      case 'daily':
        next.setDate(next.getDate() + reminder.recurrence.interval);
        break;
      case 'weekly':
        next.setDate(next.getDate() + (7 * reminder.recurrence.interval));
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + reminder.recurrence.interval);
        break;
      case 'custom':
        if (reminder.recurrence.daysOfWeek?.length) {
          const today = next.getDay();
          const days = reminder.recurrence.daysOfWeek.sort();
          let nextDay = days.find(d => d > today);
          if (nextDay === undefined) nextDay = days[0] + 7;
          next.setDate(next.getDate() + (nextDay - today));
        }
        break;
      default:
        return null;
    }

    return next;
  }

  /**
   * Synchronize all recurring reminders — call on startup to catch missed
   */
  async syncRecurringReminders() {
    const now = new Date();
    const missed = await AIReminder.find({
      recurrence: { $ne: null, $exists: true },
      status: 'pending',
      nextScheduledAt: { $lte: now },
    }).populate('patient').limit(100);

    for (const reminder of missed) {
      await this.sendReminder(reminder);
    }

    console.log(`[ReminderScheduler] Synced ${missed.length} missed recurring reminders`);
  }
}

module.exports = new ReminderScheduler();
