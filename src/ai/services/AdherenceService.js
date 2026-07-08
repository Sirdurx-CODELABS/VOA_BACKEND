const AIReminder = require('../models/AIReminder');
const PatientTimeline = require('../models/PatientTimeline');
const EscalationEngine = require('./EscalationEngine');

class AdherenceService {
  /**
   * Calculate adherence score for a patient over a date range
   * Score = (completed / total) * 100
   */
  async calculateScore(patientId, startDate, endDate) {
    const query = {
      patient: patientId,
      scheduledTime: { $gte: startDate, $lte: endDate },
      status: { $in: ['pending', 'sent', 'completed', 'skipped', 'snoozed', 'expired'] },
    };

    const reminders = await AIReminder.find(query).lean();
    if (!reminders.length) return { score: 100, completed: 0, total: 0 };

    const completed = reminders.filter(r => r.status === 'completed').length;
    const total = reminders.length;
    const score = Math.round((completed / total) * 100);

    return { score, completed, total };
  }

  /**
   * Update streak for a patient after a reminder action
   */
  async updateStreak(patientId) {
    const recent = await AIReminder.find({
      patient: patientId,
      status: 'completed',
    }).sort({ lastActionAt: -1 }).limit(30).lean();

    if (!recent.length) return 0;

    let streak = 0;
    const sorted = recent.sort((a, b) => b.lastActionAt - a.lastActionAt);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const r of sorted) {
      const actionDate = new Date(r.lastActionAt);
      actionDate.setHours(0, 0, 0, 0);
      const diffDays = Math.round((today - actionDate) / (1000 * 60 * 60 * 24));

      if (streak === 0 && diffDays > 1) return 0;
      if (diffDays <= 1) {
        streak++;
      } else {
        break;
      }
    }

    await AIReminder.updateMany(
      { patient: patientId },
      { $set: { streak } },
    );

    return streak;
  }

  /**
   * Evaluate escalation rules after missed reminders
   * Level 0: Nothing (1-2 missed)
   * Level 1: Notify adherence counselor (3 missed)
   * Level 2: Notify case manager (5 missed)
   * Level 3: Notify doctor + hospital admin (7+ missed)
   */
  async evaluateEscalation(patientId, reminderId) {
    const missedCount = await AIReminder.countDocuments({
      patient: patientId,
      status: { $in: ['pending', 'sent', 'expired'] },
      scheduledTime: { $lte: new Date() },
    });

    const reminder = await AIReminder.findById(reminderId);
    if (!reminder) return;

    let level = 0;
    if (missedCount >= 7) level = 3;
    else if (missedCount >= 5) level = 2;
    else if (missedCount >= 3) level = 1;

    if (level > reminder.escalationLevel) {
      const escalationTargets = {
        1: 'counselor',
        2: 'case_manager',
        3: 'doctor',
      };

      const target = escalationTargets[level] || 'counselor';

      reminder.escalationLevel = level;
      reminder.escalationHistory.push({
        escalatedTo: target,
        escalatedAt: new Date(),
        reason: `${missedCount} missed reminders (Level ${level} escalation)`,
      });
      await reminder.save();

      // Create timeline entry
      await PatientTimeline.create({
        patient: patientId,
        activityType: 'adherence_review',
        description: `Escalation Level ${level}: ${missedCount} reminders missed. Notified ${target}.`,
        metadata: { escalationLevel: level, missedCount, escalatedTo: target },
        source: 'system',
      });

      // Trigger escalation engine
      try {
        await EscalationEngine.trigger({
          patientId,
          reminderId,
          escalationLevel: level,
          escalatedTo: target,
          reason: `${missedCount} missed reminders`,
        });
      } catch (err) {
        console.error('[AdherenceService] EscalationEngine error:', err.message);
      }
    }

    return { level, missedCount };
  }

  /**
   * Process a reminder action and update adherence tracking
   */
  async processAction(reminderId, action, options = {}) {
    const { note, source, userId } = options;

    const reminder = await AIReminder.findById(reminderId).populate('patient');
    if (!reminder) throw new Error('Reminder not found');

    const now = new Date();

    reminder.actions.push({
      action,
      timestamp: now,
      note: note || '',
      source: source || 'web',
    });

    switch (action) {
      case 'taken':
        reminder.status = 'completed';
        reminder.lastActionAt = now;
        break;
      case 'snoozed':
        reminder.snoozeCount += 1;
        if (reminder.snoozeCount >= reminder.maxSnoozes) {
          reminder.status = 'expired';
        } else {
          reminder.status = 'snoozed';
          reminder.snoozedUntil = new Date(now.getTime() + 10 * 60 * 1000);
        }
        break;
      case 'skipped':
        reminder.status = 'skipped';
        break;
      case 'need_help':
        reminder.status = 'pending';
        // Opens AI chat context
        break;
    }

    await reminder.save();

    // Update streak and adherence score
    const patientId = reminder.patient._id || reminder.patient;
    const streak = await this.updateStreak(patientId);

    // Evaluate escalation for negative actions
    if (['skipped', 'expired'].includes(reminder.status) || (action === 'snoozed' && reminder.snoozeCount >= reminder.maxSnoozes)) {
      await this.evaluateEscalation(patientId, reminderId);
    }

    const timelineActivityType = action === 'taken' ? 'medication_refilled' : 'adherence_review';

    await PatientTimeline.create({
      patient: patientId,
      hospital: reminder.hospital,
      activityType: timelineActivityType,
      description: `Reminder "${reminder.title}" — ${action}${note ? ` (${note})` : ''}`,
      metadata: {
        reminderId: reminder._id,
        reminderType: reminder.reminderType,
        action,
        streak,
        adherenceScore: reminder.adherenceScore,
      },
      source: source || 'web',
      performedBy: userId || null,
    });

    return { reminder, streak, adherenceScore: reminder.adherenceScore };
  }

  /**
   * Get adherence analytics for a patient
   */
  async getPatientAnalytics(patientId, days = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const score = await this.calculateScore(patientId, startDate, endDate);
    const streak = await this.updateStreak(patientId);

    const reminders = await AIReminder.find({
      patient: patientId,
      scheduledTime: { $gte: startDate, $lte: endDate },
    }).sort({ scheduledTime: -1 }).lean();

    const byType = {};
    for (const r of reminders) {
      if (!byType[r.reminderType]) byType[r.reminderType] = { total: 0, completed: 0 };
      byType[r.reminderType].total++;
      if (r.status === 'completed') byType[r.reminderType].completed++;
    }

    const byDay = {};
    for (const r of reminders) {
      const day = new Date(r.scheduledTime).toISOString().split('T')[0];
      if (!byDay[day]) byDay[day] = { total: 0, completed: 0 };
      byDay[day].total++;
      if (r.status === 'completed') byDay[day].completed++;
    }

    return {
      score: score.score,
      streak,
      completed: score.completed,
      total: score.total,
      byType,
      byDay,
      period: { startDate, endDate },
    };
  }
}

module.exports = new AdherenceService();
