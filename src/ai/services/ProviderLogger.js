/**
 * ProviderLogger — Logs every AI provider request for analytics, cost tracking,
 * and debugging. Stores logs in MongoDB (AIProviderLog model).
 */

const AIProviderLog = require('../models/AIProviderLog');
const logger = require('../../utils/logger');

class ProviderLogger {
  /**
   * Log a successful provider interaction
   */
  async logSuccess({
    provider, model, level, conversationId, patientId,
    intent, riskLevel, doctorEscalation,
    inputTokens, outputTokens, cost, latency,
    fallbackUsed, attemptedChain,
  }) {
    try {
      await AIProviderLog.create({
        provider,
        model,
        level,
        conversationId,
        patientId,
        intent,
        riskLevel,
        doctorEscalation,
        inputTokens: inputTokens || 0,
        outputTokens: outputTokens || 0,
        totalTokens: (inputTokens || 0) + (outputTokens || 0),
        cost: cost || 0,
        latency: latency || 0,
        fallbackUsed: !!fallbackUsed,
        attemptedChain: attemptedChain || [provider],
        status: 'success',
      });
    } catch (err) {
      logger.error(`Failed to log AI provider success: ${err.message}`);
    }
  }

  /**
   * Log a failed provider interaction
   */
  async logError({
    provider, level, conversationId, patientId,
    error, attemptedChain,
  }) {
    try {
      await AIProviderLog.create({
        provider,
        level,
        conversationId,
        patientId,
        attemptedChain: attemptedChain || [provider],
        error: error?.substring(0, 500) || 'Unknown error',
        status: 'error',
        fallbackUsed: (attemptedChain?.length || 0) > 1,
      });
    } catch (err) {
      logger.error(`Failed to log AI provider error: ${err.message}`);
    }
  }

  /**
   * Get provider usage statistics
   */
  async getStats(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [usage, topIntents, riskDistribution, failures] = await Promise.all([
      AIProviderLog.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'success' } },
        {
          $group: {
            _id: '$provider',
            count: { $sum: 1 },
            totalTokens: { $sum: '$totalTokens' },
            totalCost: { $sum: '$cost' },
            avgLatency: { $avg: '$latency' },
            totalLatency: { $sum: '$latency' },
          },
        },
        { $sort: { count: -1 } },
      ]),
      AIProviderLog.aggregate([
        { $match: { createdAt: { $gte: since }, intent: { $ne: '' } } },
        { $group: { _id: '$intent', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      AIProviderLog.aggregate([
        { $match: { createdAt: { $gte: since }, riskLevel: { $ne: '' } } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AIProviderLog.aggregate([
        { $match: { createdAt: { $gte: since }, status: 'error' } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    return { usage, topIntents, riskDistribution, failures };
  }
}

module.exports = new ProviderLogger();
