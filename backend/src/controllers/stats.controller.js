import UsageMetric from '../models/UsageMetric.js';
import Document from '../models/Document.js';
import ChatSession from '../models/ChatSession.js';
import Message from '../models/Message.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';

/**
 * Get dashboard stats
 * GET /api/v1/stats/dashboard
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
  const companyId = req.companyId;

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Run all queries in parallel
  const [
    totalDocuments,
    totalSessions,
    todayUsage,
    allTimeUsage,
  ] = await Promise.all([
    // Total documents count
    Document.countDocuments({ company: companyId }),

    // Total chat sessions count
    ChatSession.countDocuments({ company: companyId }),

    // Today's usage metrics
    UsageMetric.aggregate([
      {
        $match: {
          company: companyId,
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: null,
          queriesCount: { $sum: '$metrics.chatMessages' },
          tokensUsed: { $sum: '$metrics.tokensUsed.total' },
          promptTokens: { $sum: '$metrics.tokensUsed.prompt' },
          completionTokens: { $sum: '$metrics.tokensUsed.completion' },
        },
      },
    ]),

    // All time usage
    UsageMetric.aggregate([
      {
        $match: {
          company: companyId,
        },
      },
      {
        $group: {
          _id: null,
          totalQueries: { $sum: '$metrics.chatMessages' },
          totalTokens: { $sum: '$metrics.tokensUsed.total' },
          totalPromptTokens: { $sum: '$metrics.tokensUsed.prompt' },
          totalCompletionTokens: { $sum: '$metrics.tokensUsed.completion' },
        },
      },
    ]),
  ]);

  const todayStats = todayUsage[0] || { queriesCount: 0, tokensUsed: 0 };
  const allTimeStats = allTimeUsage[0] || { totalQueries: 0, totalTokens: 0 };

  const stats = {
    documents: {
      total: totalDocuments,
    },
    sessions: {
      total: totalSessions,
    },
    today: {
      queries: todayStats.queriesCount || 0,
      tokens: todayStats.tokensUsed || 0,
    },
    allTime: {
      queries: allTimeStats.totalQueries || 0,
      tokens: allTimeStats.totalTokens || 0,
    },
  };

  res.json(new ApiResponse(200, stats, 'Dashboard stats retrieved'));
});

/**
 * Get usage over time
 * GET /api/v1/stats/usage
 */
export const getUsageStats = asyncHandler(async (req, res) => {
  const companyId = req.companyId;
  const { days = 30 } = req.query;

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(days));
  startDate.setHours(0, 0, 0, 0);

  const usage = await UsageMetric.aggregate([
    {
      $match: {
        company: companyId,
        date: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
        queries: { $sum: '$metrics.chatMessages' },
        tokens: { $sum: '$metrics.tokensUsed.total' },
        documents: { $sum: '$metrics.documentsUploaded' },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  res.json(new ApiResponse(200, { usage, days: parseInt(days) }, 'Usage stats retrieved'));
});
