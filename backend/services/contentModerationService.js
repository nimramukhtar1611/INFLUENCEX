// services/contentModerationService.js
const Settings = require('../models/Settings');
const User = require('../models/User');
const Campaign = require('../models/Campaign');
const Deal = require('../models/Deal');
const Message = require('../models/Message');
const Review = require('../models/Review');
const notificationService = require('./notificationService');

class ContentModerationService {
  constructor() {
    this.aiModerationEnabled = true;
    this.manualModerationEnabled = true;
  }

  /**
   * Moderate content based on platform settings
   * @param {string} contentType - Type of content (campaign, deal, message, review, deliverable)
   * @param {Object} content - Content object to moderate
   * @param {string} userId - User ID who created the content
   * @returns {Object} Moderation result
   */
  async moderateContent(contentType, content, userId) {
    try {
      const settings = await Settings.getSettings();
      const moderationSettings = settings.contentModeration || {};
      const userApprovalSettings = settings.userApproval || {};

      // Get moderation type for this content type
      const contentTypeSettings = moderationSettings.contentTypes?.[contentType];
      if (!contentTypeSettings) {
        return { approved: true, reason: 'No moderation settings for this content type' };
      }

      // Check if user is verified (if verification is required)
      if (userApprovalSettings.requireVerification) {
        const user = await User.findById(userId);
        if (!user.isVerified) {
          return {
            approved: false,
            requiresVerification: true,
            reason: 'User verification required before content approval'
          };
        }
      }

      // Determine moderation approach
      const moderationType = contentTypeSettings.moderationType || moderationSettings.moderationType || 'ai';
      
      let moderationResult = {
        approved: false,
        requiresManualReview: false,
        flagged: false,
        flags: [],
        score: 0,
        reason: ''
      };

      switch (moderationType) {
        case 'ai':
          moderationResult = await this.aiModerate(content, moderationSettings);
          break;
        case 'manual':
          moderationResult = await this.manualModerate(content, moderationSettings);
          break;
        case 'hybrid':
          moderationResult = await this.hybridModerate(content, moderationSettings);
          break;
      }

      // Apply auto-approval settings
      if (!moderationResult.flagged && moderationSettings.autoApproveContent) {
        moderationResult.approved = true;
      }

      // Log moderation result
      await this.logModeration(contentType, content, userId, moderationResult);

      return moderationResult;
    } catch (error) {
      console.error('Content moderation error:', error);
      return {
        approved: false,
        error: error.message,
        requiresManualReview: true
      };
    }
  }

  /**
   * AI-based content moderation
   */
  async aiModerate(content, settings) {
    const result = {
      approved: false,
      flagged: false,
      flags: [],
      score: 0,
      reason: ''
    };

    try {
      // Check for banned words
      const bannedWords = settings.bannedWords || [];
      const contentText = this.extractTextFromContent(content);
      
      for (const bannedWord of bannedWords) {
        if (contentText.toLowerCase().includes(bannedWord.word.toLowerCase())) {
          result.flagged = true;
          result.flags.push({
            type: 'banned_word',
            word: bannedWord.word,
            severity: bannedWord.severity || 'medium'
          });
        }
      }

      // Check for banned phrases
      const bannedPhrases = settings.bannedPhrases || [];
      for (const bannedPhrase of bannedPhrases) {
        if (contentText.toLowerCase().includes(bannedPhrase.phrase.toLowerCase())) {
          result.flagged = true;
          result.flags.push({
            type: 'banned_phrase',
            phrase: bannedPhrase.phrase,
            severity: bannedPhrase.severity || 'medium'
          });
        }
      }

      // Profanity filter
      if (settings.profanityFilter) {
        const profanityFlags = await this.checkProfanity(contentText);
        if (profanityFlags.length > 0) {
          result.flagged = true;
          result.flags.push(...profanityFlags);
        }
      }

      // Spam filter
      if (settings.spamFilter) {
        const spamScore = await this.calculateSpamScore(content);
        if (spamScore > 0.7) {
          result.flagged = true;
          result.flags.push({
            type: 'spam',
            score: spamScore,
            severity: 'high'
          });
        }
      }

      // Calculate overall score
      result.score = this.calculateModerationScore(result.flags, settings);

      // Determine if content should be flagged based on threshold
      const threshold = settings.flagThreshold || 0.7;
      result.flagged = result.score >= threshold;

      // Set approval status
      result.approved = !result.flagged;
      result.requiresManualReview = result.flagged && settings.manualReviewRequired;

      if (result.flagged) {
        result.reason = `Content flagged by AI moderation (score: ${result.score.toFixed(2)})`;
      } else {
        result.reason = 'Content passed AI moderation';
      }

    } catch (error) {
      console.error('AI moderation error:', error);
      result.requiresManualReview = true;
      result.reason = 'AI moderation failed, requiring manual review';
    }

    return result;
  }

  /**
   * Manual content moderation
   */
  async manualModerate(content, settings) {
    return {
      approved: false,
      requiresManualReview: true,
      flagged: false,
      flags: [],
      score: 0,
      reason: 'Content requires manual admin review'
    };
  }

  /**
   * Hybrid moderation (AI + Manual)
   */
  async hybridModerate(content, settings) {
    // First run AI moderation
    const aiResult = await this.aiModerate(content, settings);
    
    // If AI flags content, require manual review
    if (aiResult.flagged) {
      return {
        ...aiResult,
        approved: false,
        requiresManualReview: true,
        reason: 'Content flagged by AI, requires manual review'
      };
    }

    // If AI passes content, still require manual review for sensitive content types
    if (settings.manualReviewRequired) {
      return {
        ...aiResult,
        approved: false,
        requiresManualReview: true,
        reason: 'AI passed, but manual review required by settings'
      };
    }

    // Auto-approve if AI passes and manual review not required
    return {
      ...aiResult,
      approved: true,
      requiresManualReview: false,
      reason: 'Content approved by AI moderation'
    };
  }

  /**
   * Extract text content from various content types
   */
  extractTextFromContent(content) {
    let text = '';
    
    if (content.title) text += content.title + ' ';
    if (content.description) text += content.description + ' ';
    if (content.content) text += content.content + ' ';
    if (content.message) text += content.message + ' ';
    if (content.text) text += content.text + ' ';
    if (content.body) text += content.body + ' ';
    
    return text.toLowerCase();
  }

  /**
   * Check for profanity in text
   */
  async checkProfanity(text) {
    const profanityList = [
      'damn', 'hell', 'shit', 'fuck', 'bitch', 'ass', 'bastard', 'crap', 'piss', 'dick'
    ];
    
    const flags = [];
    const words = text.split(/\s+/);
    
    for (const word of words) {
      if (profanityList.includes(word.toLowerCase().replace(/[^\w]/g, ''))) {
        flags.push({
          type: 'profanity',
          word: word,
          severity: 'medium'
        });
      }
    }
    
    return flags;
  }

  /**
   * Calculate spam score
   */
  async calculateSpamScore(content) {
    const text = this.extractTextFromContent(content);
    let score = 0;
    
    // Check for excessive capitalization
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.3) score += 0.2;
    
    // Check for excessive punctuation
    const punctRatio = (text.match(/[!?]/g) || []).length / text.length;
    if (punctRatio > 0.1) score += 0.2;
    
    // Check for repetitive characters
    if (/(.)\1{3,}/.test(text)) score += 0.3;
    
    // Check for common spam phrases
    const spamPhrases = ['click here', 'free money', 'urgent', 'limited time', 'act now'];
    for (const phrase of spamPhrases) {
      if (text.includes(phrase)) score += 0.1;
    }
    
    return Math.min(score, 1);
  }

  /**
   * Calculate overall moderation score
   */
  calculateModerationScore(flags, settings) {
    if (flags.length === 0) return 0;
    
    let totalScore = 0;
    const severityWeights = { low: 0.3, medium: 0.6, high: 1.0 };
    
    for (const flag of flags) {
      const weight = severityWeights[flag.severity] || 0.5;
      totalScore += weight;
    }
    
    return Math.min(totalScore / flags.length, 1);
  }

  /**
   * Log moderation results
   */
  async logModeration(contentType, content, userId, result) {
    try {
      const AuditLog = require('../models/AuditLog');
      
      await AuditLog.create({
        action: 'content_moderated',
        targetUser: userId,
        metadata: {
          contentType,
          contentId: content._id,
          result: {
            approved: result.approved,
            flagged: result.flagged,
            requiresManualReview: result.requiresManualReview,
            score: result.score,
            reason: result.reason,
            flags: result.flags
          }
        },
        ipAddress: 'system',
        userAgent: 'moderation-service'
      });
    } catch (error) {
      console.error('Failed to log moderation:', error);
    }
  }

  /**
   * Get pending content for manual review
   */
  async getPendingContent(contentType = null, page = 1, limit = 20) {
    try {
      const query = { 
        status: 'pending_moderation',
        requiresManualReview: true
      };
      
      if (contentType) {
        query.contentType = contentType;
      }
      
      // This would need a ContentModerationLog model to track pending content
      // For now, return empty structure
      return {
        content: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        }
      };
    } catch (error) {
      console.error('Failed to get pending content:', error);
      throw error;
    }
  }

  /**
   * Approve content manually
   */
  async approveContent(contentId, adminId, notes = '') {
    try {
      // Update content status to approved
      // This would depend on the specific content model
      
      // Log the approval
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        adminId,
        action: 'content_approved',
        metadata: {
          contentId,
          notes,
          timestamp: new Date()
        },
        ipAddress: 'system',
        userAgent: 'admin-panel'
      });

      // Notify content creator
      await notificationService.createNotification(
        contentId, // This would need to be resolved to userId
        'content_approved',
        'Your content has been approved',
        'Your content has passed moderation and is now live.',
        { contentId, approvedBy: adminId }
      );

      return { success: true, message: 'Content approved successfully' };
    } catch (error) {
      console.error('Failed to approve content:', error);
      throw error;
    }
  }

  /**
   * Reject content manually
   */
  async rejectContent(contentId, adminId, reason, notes = '') {
    try {
      // Update content status to rejected
      // This would depend on the specific content model
      
      // Log the rejection
      const AuditLog = require('../models/AuditLog');
      await AuditLog.create({
        adminId,
        action: 'content_rejected',
        metadata: {
          contentId,
          reason,
          notes,
          timestamp: new Date()
        },
        ipAddress: 'system',
        userAgent: 'admin-panel'
      });

      // Notify content creator
      await notificationService.createNotification(
        contentId, // This would need to be resolved to userId
        'content_rejected',
        'Your content has been rejected',
        `Your content was not approved. Reason: ${reason}`,
        { contentId, rejectedBy: adminId, reason }
      );

      return { success: true, message: 'Content rejected successfully' };
    } catch (error) {
      console.error('Failed to reject content:', error);
      throw error;
    }
  }
}

module.exports = new ContentModerationService();
