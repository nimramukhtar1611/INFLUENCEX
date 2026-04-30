// utils/databaseHelper.js - DATABASE QUERY WRAPPER WITH COMPREHENSIVE ERROR HANDLING
const mongoose = require('mongoose');
const { createError } = require('./AppError');

/**
 * Database query wrapper with comprehensive error handling
 * Prevents server crashes from database failures
 */
class DatabaseHelper {
  /**
   * Execute database operation with proper error handling
   * @param {Function} operation - Database operation function
   * @param {Object} options - Configuration options
   * @returns {Promise} - Result of the operation
   */
  static async execute(operation, options = {}) {
    const {
      operationName = 'Database Operation',
      retries = 3,
      retryDelay = 1000,
      timeout = 30000,
      fallbackValue = null,
      logErrors = true
    } = options;

    let lastError = null;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Check database connection before operation
        if (mongoose.connection.readyState !== 1) {
          throw new Error('Database not connected');
        }

        // Execute with timeout
        const result = await Promise.race([
          operation(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database operation timeout')), timeout)
          )
        ]);

        if (attempt > 1) {
          console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
        }

        return result;
        
      } catch (error) {
        lastError = error;
        
        if (logErrors) {
          console.error(`❌ ${operationName} failed (attempt ${attempt}/${retries}):`, {
            message: error.message,
            name: error.name,
            code: error.code,
            stack: error.stack
          });
        }

        // Don't retry on certain errors
        const nonRetryableErrors = [
          'ValidationError',
          'CastError',
          'DocumentNotFoundError',
          'MongoServerError',
          'BSONError'
        ];

        if (nonRetryableErrors.includes(error.name)) {
          break;
        }

        // Wait before retry (exponential backoff)
        if (attempt < retries) {
          const delay = retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    console.error(`💀 ${operationName} failed after ${retries} attempts`);
    
    // Don't crash the server, return fallback or throw specific error
    if (fallbackValue !== null) {
      console.log(`🔄 Using fallback value for ${operationName}`);
      return fallbackValue;
    }

    // Create appropriate error response
    if (lastError.name === 'ValidationError') {
      throw createError('Validation failed', 400);
    } else if (lastError.name === 'CastError') {
      throw createError('Invalid data format', 400);
    } else if (lastError.name === 'DocumentNotFoundError') {
      throw createError('Resource not found', 404);
    } else if (lastError.message.includes('Database not connected')) {
      throw createError('Database temporarily unavailable', 503);
    } else if (lastError.message.includes('timeout')) {
      throw createError('Database operation timeout', 504);
    } else {
      throw createError('Database operation failed', 500);
    }
  }

  /**
   * Safe find operation with error handling
   */
  static async find(Model, query = {}, options = {}) {
    const {
      populate = '',
      sort = {},
      limit = 0,
      skip = 0,
      lean = false,
      operationName = `Find ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      let dbQuery = Model.find(query);
      
      if (populate) dbQuery = dbQuery.populate(populate);
      if (Object.keys(sort).length > 0) dbQuery = dbQuery.sort(sort);
      if (skip > 0) dbQuery = dbQuery.skip(skip);
      if (limit > 0) dbQuery = dbQuery.limit(limit);
      if (lean) dbQuery = dbQuery.lean();
      
      return await dbQuery;
    }, { operationName });
  }

  /**
   * Safe findOne operation with error handling
   */
  static async findOne(Model, query = {}, options = {}) {
    const {
      populate = '',
      lean = false,
      operationName = `FindOne ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      let dbQuery = Model.findOne(query);
      
      if (populate) dbQuery = dbQuery.populate(populate);
      if (lean) dbQuery = dbQuery.lean();
      
      return await dbQuery;
    }, { operationName });
  }

  /**
   * Safe findById operation with error handling
   */
  static async findById(Model, id, options = {}) {
    const {
      populate = '',
      lean = false,
      operationName = `FindById ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      let dbQuery = Model.findById(id);
      
      if (populate) dbQuery = dbQuery.populate(populate);
      if (lean) dbQuery = dbQuery.lean();
      
      return await dbQuery;
    }, { operationName });
  }

  /**
   * Safe create operation with error handling
   */
  static async create(Model, data, options = {}) {
    const {
      operationName = `Create ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      return await Model.create(data);
    }, { operationName });
  }

  /**
   * Safe update operation with error handling
   */
  static async updateOne(Model, query, update, options = {}) {
    const {
      operationName = `UpdateOne ${Model.modelName}`,
      returnNew = true,
      runValidators = true
    } = options;

    return this.execute(async () => {
      return await Model.updateOne(query, update, { new: returnNew, runValidators });
    }, { operationName });
  }

  /**
   * Safe findByIdAndUpdate operation with error handling
   */
  static async findByIdAndUpdate(Model, id, update, options = {}) {
    const {
      populate = '',
      returnNew = true,
      runValidators = true,
      operationName = `FindByIdAndUpdate ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      let dbQuery = Model.findByIdAndUpdate(id, update, { new: returnNew, runValidators });
      
      if (populate) dbQuery = dbQuery.populate(populate);
      
      return await dbQuery;
    }, { operationName });
  }

  /**
   * Safe delete operation with error handling
   */
  static async deleteOne(Model, query, options = {}) {
    const {
      operationName = `DeleteOne ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      return await Model.deleteOne(query);
    }, { operationName });
  }

  /**
   * Safe findByIdAndDelete operation with error handling
   */
  static async findByIdAndDelete(Model, id, options = {}) {
    const {
      operationName = `FindByIdAndDelete ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      return await Model.findByIdAndDelete(id);
    }, { operationName });
  }

  /**
   * Safe aggregate operation with error handling
   */
  static async aggregate(Model, pipeline, options = {}) {
    const {
      operationName = `Aggregate ${Model.modelName}`,
      timeout = 60000 // Aggregations can take longer
    } = options;

    return this.execute(async () => {
      return await Model.aggregate(pipeline);
    }, { operationName, timeout });
  }

  /**
   * Safe count operation with error handling
   */
  static async countDocuments(Model, query = {}, options = {}) {
    const {
      operationName = `Count ${Model.modelName}`
    } = options;

    return this.execute(async () => {
      return await Model.countDocuments(query);
    }, { operationName });
  }

  /**
   * Check database health
   */
  static async checkHealth() {
    try {
      const state = mongoose.connection.readyState;
      const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
      };

      // Test with a simple ping
      await mongoose.connection.db.admin().ping();

      return {
        status: 'healthy',
        connectionState: states[state],
        host: mongoose.connection.host,
        name: mongoose.connection.name,
        readyState: state
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connectionState: 'disconnected'
      };
    }
  }

  /**
   * Graceful shutdown handler
   */
  static async shutdown() {
    try {
      console.log('🔄 Gracefully closing database connections...');
      await mongoose.connection.close();
      console.log('✅ Database connections closed');
    } catch (error) {
      console.error('❌ Error closing database connections:', error.message);
    }
  }
}

// Handle process termination
process.on('SIGINT', DatabaseHelper.shutdown);
process.on('SIGTERM', DatabaseHelper.shutdown);

module.exports = DatabaseHelper;
