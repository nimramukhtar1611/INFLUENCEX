const GlobalSettings = require('../models/GlobalSettings');
const User = require('../models/User');

/**
 * Payment Gateway Audit Middleware
 * Logs all payment gateway configuration changes for security and compliance
 */
class PaymentGatewayAudit {
  /**
   * Middleware to log payment gateway settings changes
   */
  static async auditPaymentGatewayChange(req, res, next) {
    try {
      // Store original settings before update
      if (req.method === 'PUT' && req.path.includes('/payment-gateway')) {
        const originalSettings = await GlobalSettings.findOne();
        req.originalPaymentGatewaySettings = originalSettings ? 
          JSON.parse(JSON.stringify(originalSettings.paymentGateway || {})) : {};
      }

      // Capture user information
      req.auditUser = {
        id: req.user?.id,
        email: req.user?.email,
        role: req.user?.role,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      };

      next();
    } catch (error) {
      console.error('Payment gateway audit middleware error:', error);
      next(); // Continue even if audit fails
    }
  }

  /**
   * Log payment gateway settings change
   */
  static async logSettingsChange(req, changes, result) {
    try {
      const auditData = {
        action: 'PAYMENT_GATEWAY_SETTINGS_UPDATE',
        user: req.auditUser,
        timestamp: new Date(),
        changes: changes,
        result: {
          success: result.success,
          error: result.error || null,
          timestamp: new Date()
        },
        metadata: {
          endpoint: req.path,
          method: req.method,
          requestId: req.id || 'unknown',
          sessionDuration: Date.now() - req.startTime
        }
      };

      // Add to GlobalSettings audit log
      await this.addToSettingsAuditLog(auditData);

      // Log to console for immediate visibility
      console.log('=== PAYMENT GATEWAY AUDIT LOG ===');
      console.log('User:', auditData.user.email, '(', auditData.user.id, ')');
      console.log('Action:', auditData.action);
      console.log('Changes:', JSON.stringify(changes, null, 2));
      console.log('Result:', auditData.result.success ? 'SUCCESS' : 'FAILED');
      console.log('IP Address:', auditData.user.ip);
      console.log('Timestamp:', auditData.timestamp.toISOString());
      console.log('=====================================');

      // Send to external monitoring if configured
      await this.sendToMonitoringService(auditData);

    } catch (error) {
      console.error('Failed to log payment gateway audit:', error);
    }
  }

  /**
   * Add audit entry to GlobalSettings
   */
  static async addToSettingsAuditLog(auditData) {
    try {
      const settings = await GlobalSettings.findOne();
      
      if (!settings) {
        console.warn('No GlobalSettings found for audit logging');
        return;
      }

      // Initialize audit log if not exists
      if (!settings.audit) {
        settings.audit = {};
      }
      if (!settings.audit.changeLog) {
        settings.audit.changeLog = [];
      }

      // Create structured audit entry
      const auditEntry = {
        timestamp: auditData.timestamp,
        changedBy: auditData.user.id,
        action: auditData.action,
        changes: auditData.changes,
        result: auditData.result,
        metadata: auditData.metadata,
        ip: auditData.user.ip,
        userAgent: auditData.user.userAgent,
        sessionId: req.session?.id || 'anonymous'
      };

      // Add to change log
      settings.audit.changeLog.push(auditEntry);

      // Keep only last 1000 audit entries to prevent bloat
      if (settings.audit.changeLog.length > 1000) {
        settings.audit.changeLog = settings.audit.changeLog.slice(-1000);
      }

      // Update audit metadata
      settings.audit.lastUpdatedBy = auditData.user.id;
      settings.audit.lastUpdated = auditData.timestamp;

      await settings.save();

    } catch (error) {
      console.error('Failed to add audit entry to GlobalSettings:', error);
    }
  }

  /**
   * Send audit data to monitoring service
   */
  static async sendToMonitoringService(auditData) {
    try {
      // Check if monitoring is enabled
      if (!process.env.AUDIT_MONITORING_ENABLED) {
        return;
      }

      // Send to external monitoring service (e.g., Sentry, LogRocket, etc.)
      // This is a placeholder for actual monitoring integration
      if (process.env.AUDIT_WEBHOOK_URL) {
        const fetch = require('node-fetch');
        
        await fetch(process.env.AUDIT_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.AUDIT_WEBHOOK_SECRET}`
          },
          body: JSON.stringify(auditData),
          timeout: 5000
        }).catch(error => {
          console.warn('Failed to send audit to monitoring service:', error.message);
        });
      }

    } catch (error) {
      console.error('Failed to send audit to monitoring service:', error);
    }
  }

  /**
   * Get audit log for payment gateway changes
   */
  static async getAuditLog(req, res, next) {
    try {
      const { limit = 50, offset = 0, userId, action, startDate, endDate } = req.query;

      const settings = await GlobalSettings.findOne();
      
      if (!settings || !settings.audit || !settings.audit.changeLog) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          message: 'No audit logs found'
        });
      }

      let auditLogs = settings.audit.changeLog;

      // Filter by user ID
      if (userId) {
        auditLogs = auditLogs.filter(log => 
          log.changedBy && log.changedBy.toString() === userId
        );
      }

      // Filter by action
      if (action) {
        auditLogs = auditLogs.filter(log => 
          log.action && log.action.includes(action.toUpperCase())
        );
      }

      // Filter by date range
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        
        auditLogs = auditLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= start && logDate <= end;
        });
      }

      // Sort by timestamp (newest first)
      auditLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Apply pagination
      const total = auditLogs.length;
      const paginatedLogs = auditLogs.slice(
        parseInt(offset), 
        parseInt(offset) + parseInt(limit)
      );

      // Enrich with user details
      const enrichedLogs = await Promise.all(
        paginatedLogs.map(async (log) => {
          try {
            if (log.changedBy) {
              const user = await User.findById(log.changedBy).select('email role');
              return {
                ...log,
                user: user ? {
                  id: user._id,
                  email: user.email,
                  role: user.role
                } : null
              };
            }
            return log;
          } catch (error) {
            console.warn('Failed to enrich audit log with user details:', error);
            return log;
          }
        })
      );

      res.json({
        success: true,
        data: enrichedLogs,
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        message: 'Audit logs retrieved successfully'
      });

    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(req, res, next) {
    try {
      const { startDate, endDate, format = 'json' } = req.query;

      const settings = await GlobalSettings.findOne();
      
      if (!settings || !settings.audit || !settings.audit.changeLog) {
        return res.json({
          success: false,
          error: 'No audit data available'
        });
      }

      let auditLogs = settings.audit.changeLog;

      // Filter by date range
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date();
        
        auditLogs = auditLogs.filter(log => {
          const logDate = new Date(log.timestamp);
          return logDate >= start && logDate <= end;
        });
      }

      // Filter only payment gateway related logs
      auditLogs = auditLogs.filter(log => 
        log.action && log.action.includes('PAYMENT_GATEWAY')
      );

      // Generate report statistics
      const report = {
        metadata: {
          generatedAt: new Date(),
          generatedBy: req.user?.id,
          dateRange: {
            start: startDate || new Date(0),
            end: endDate || new Date()
          },
          totalEntries: auditLogs.length
        },
        statistics: {
          totalChanges: auditLogs.length,
          successfulChanges: auditLogs.filter(log => log.result?.success).length,
          failedChanges: auditLogs.filter(log => log.result?.success === false).length,
          uniqueUsers: [...new Set(auditLogs.map(log => log.changedBy))].length,
          mostCommonChanges: this.getMostCommonChanges(auditLogs),
          changesByHour: this.getChangesByHour(auditLogs),
          changesByDay: this.getChangesByDay(auditLogs)
        },
        recentChanges: auditLogs.slice(0, 10).map(log => ({
          timestamp: log.timestamp,
          user: log.changedBy,
          action: log.action,
          success: log.result?.success,
          ip: log.ip
        }))
      };

      if (format === 'csv') {
        // Convert to CSV format
        const csv = this.convertAuditToCSV(auditLogs);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="payment-gateway-audit-${Date.now()}.csv"`);
        return res.send(csv);
      }

      res.json({
        success: true,
        data: report,
        message: 'Audit report generated successfully'
      });

    } catch (error) {
      console.error('Error generating audit report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get most common changes
   */
  static getMostCommonChanges(auditLogs) {
    const changes = {};
    
    auditLogs.forEach(log => {
      if (log.changes) {
        Object.keys(log.changes).forEach(key => {
          changes[key] = (changes[key] || 0) + 1;
        });
      }
    });

    return Object.entries(changes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([field, count]) => ({ field, count }));
  }

  /**
   * Get changes by hour
   */
  static getChangesByHour(auditLogs) {
    const hours = {};
    
    for (let i = 0; i < 24; i++) {
      hours[i] = 0;
    }

    auditLogs.forEach(log => {
      const hour = new Date(log.timestamp).getHours();
      hours[hour]++;
    });

    return hours;
  }

  /**
   * Get changes by day
   */
  static getChangesByDay(auditLogs) {
    const days = {};
    
    auditLogs.forEach(log => {
      const day = new Date(log.timestamp).toLocaleDateString();
      days[day] = (days[day] || 0) + 1;
    });

    return Object.entries(days)
      .sort(([,a], [,b]) => a - b)
      .slice(-30) // Last 30 days
      .map(([day, count]) => ({ day, count }));
  }

  /**
   * Convert audit logs to CSV
   */
  static convertAuditToCSV(auditLogs) {
    const headers = [
      'Timestamp', 'User ID', 'User Email', 'Action', 'IP Address', 
      'Success', 'Changes', 'User Agent'
    ];

    const rows = auditLogs.map(log => [
      log.timestamp,
      log.changedBy || '',
      '', // User email would need to be populated separately
      log.action || '',
      log.ip || '',
      log.result?.success || false,
      JSON.stringify(log.changes || {}),
      log.userAgent || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Middleware to detect suspicious activity
   */
  static async detectSuspiciousActivity(req, res, next) {
    try {
      // Check for rapid configuration changes
      const recentChanges = await this.getRecentChanges(req.user?.id, 1); // Last hour
      
      if (recentChanges.length > 5) {
        // Log suspicious activity
        console.warn('Suspicious activity detected:', {
          userId: req.user?.id,
          changes: recentChanges.length,
          ip: req.ip
        });

        // Could trigger additional security measures here
        req.suspiciousActivity = true;
      }

      next();
    } catch (error) {
      console.error('Error detecting suspicious activity:', error);
      next();
    }
  }

  /**
   * Get recent changes for a user
   */
  static async getRecentChanges(userId, hours = 24) {
    try {
      const settings = await GlobalSettings.findOne();
      
      if (!settings || !settings.audit || !settings.audit.changeLog) {
        return [];
      }

      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      return settings.audit.changeLog.filter(log => 
        log.changedBy && 
        log.changedBy.toString() === userId &&
        new Date(log.timestamp) > cutoff
      );

    } catch (error) {
      console.error('Error getting recent changes:', error);
      return [];
    }
  }
}

module.exports = PaymentGatewayAudit;
