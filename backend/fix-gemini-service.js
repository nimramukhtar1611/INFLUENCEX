// Fix Gemini Service - Enhanced Error Handling & Free Tier Support
// This file contains the fixed version of geminiService.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Enhanced Gemini Service with better error handling and free tier support
 */
class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    if (this.apiKey) {
      this.genAI = new GoogleGenerativeAI(this.apiKey);
      
      // Updated model chain with free tier priority
      this.modelChain = [
        // Free tier models (recommended)
        'models/gemini-1.5-flash',
        'models/gemini-1.5-flash-8b',
        'models/gemini-1.5-flash-latest',
        
        // Paid tier models (if available)
        process.env.GEMINI_MODEL?.startsWith('models/') ? process.env.GEMINI_MODEL : 
          process.env.GEMINI_MODEL ? `models/${process.env.GEMINI_MODEL}` : 'models/gemini-2.0-flash',
        'models/gemini-2.0-flash',
        'models/gemini-2.5-flash',
        'models/gemini-2.5-flash-lite'
      ].filter((model, index, arr) => arr.indexOf(model) === index); // Remove duplicates
    } else {
      console.warn('⚠️ GEMINI_API_KEY is not set. GeminiService will be unavailable.');
      this.modelChain = [];
    }
  }

  /**
   * Enhanced content generation with better error handling
   */
  async generateContentIdeas({ creator, platform, contentType, refreshToken }) {
    if (!this.genAI || this.modelChain.length === 0) {
      console.warn('⚠️ GeminiService not initialized or no models available');
      return null;
    }

    const nicheText = (creator.niches || []).slice(0, 3).join(', ') || 'general creator growth';
    const followerCount = Number(creator.totalFollowers || 0).toLocaleString();
    const engagement = Number(creator.averageEngagement || 0).toFixed(2);
    const nonce = refreshToken || `${Date.now()}`;

    const prompt = `You are a social media growth strategist.
Generate exactly 5 distinct ${contentType.replace('_', ' ')} content ideas for a ${platform} creator.

Creator Context:
- Niches: ${nicheText}
- Followers: ${followerCount}
- Avg Engagement: ${engagement}%
- Variation Key: ${nonce}

Requirements:
1. Return ONLY a numbered list of ideas (1. Idea, 2. Idea, etc.).
2. One idea per line.
3. Each idea must be concise (under 20 words) and practical.
4. Category Rule: Every idea MUST clearly belong to "${contentType}".
5. Safety Rule: If category is NOT beauty/health/wellness, do NOT mention skincare, skin, serum, or face masks.`;

    console.log(`🤖 [GeminiService] Starting generation with ${this.modelChain.length} models`);

    // Try each model in the chain
    for (let i = 0; i < this.modelChain.length; i++) {
      const modelName = this.modelChain[i];
      let timeoutId;
      
      try {
        console.log(`🔄 [GeminiService] Attempting generation with model: ${modelName} (${i + 1}/${this.modelChain.length})`);
        
        const model = this.genAI.getGenerativeModel({ model: modelName });
        
        // Increased timeout to 30 seconds for better reliability
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), 30000);
        });

        const startTime = Date.now();
        const result = await Promise.race([
          model.generateContent(prompt),
          timeoutPromise
        ]);

        clearTimeout(timeoutId);
        
        const responseTime = Date.now() - startTime;
        const response = await result.response;
        const text = response.text();

        console.log(`✅ [GeminiService] Success with ${modelName} in ${responseTime}ms`);

        const ideas = this.parseIdeas(text);
        if (ideas && ideas.length > 0) {
          console.log(`💡 [GeminiService] Generated ${ideas.length} ideas`);
          return { ideas, source: modelName };
        } else {
          console.warn(`⚠️ [GeminiService] No valid ideas parsed from ${modelName}`);
        }
        
      } catch (error) {
        if (timeoutId) clearTimeout(timeoutId);
        
        // Enhanced error analysis
        const errorInfo = this.analyzeError(error, modelName);
        console.warn(`❌ [GeminiService] ${errorInfo.message}`);
        
        // If it's a critical error (auth, quota), don't try more models
        if (errorInfo.isCritical) {
          console.error(`🚫 [GeminiService] Critical error detected, stopping model chain`);
          break;
        }
        
        continue; // Try next model
      }
    }

    console.error(`💥 [GeminiService] All ${this.modelChain.length} models failed`);
    return null;
  }

  /**
   * Enhanced error analysis
   */
  analyzeError(error, modelName) {
    const message = error.message || '';
    
    // Authentication errors (critical)
    if (message.includes('403') || message.includes('PERMISSION_DENIED') || message.includes('API key')) {
      return {
        isCritical: true,
        message: `Authentication failed for ${modelName}: Invalid API key or insufficient permissions`
      };
    }
    
    // Quota errors (critical for this model chain)
    if (message.includes('429') || message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
      return {
        isCritical: false,
        message: `Quota exceeded for ${modelName}, trying next model...`
      };
    }
    
    // Model not found (skip this model)
    if (message.includes('404') || message.includes('NOT_FOUND') || message.includes('Model not found')) {
      return {
        isCritical: false,
        message: `Model ${modelName} not found, trying next...`
      };
    }
    
    // Timeout errors (skip this model)
    if (message === 'TIMEOUT') {
      return {
        isCritical: false,
        message: `Model ${modelName} timed out (30s), trying next...`
      };
    }
    
    // Network errors (might be temporary)
    if (message.includes('ENOTFOUND') || message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
      return {
        isCritical: false,
        message: `Network error with ${modelName}, trying next...`
      };
    }
    
    // Unknown errors
    return {
      isCritical: false,
      message: `Unknown error with ${modelName}: ${message.substring(0, 100)}`
    };
  }

  /**
   * Enhanced idea parsing
   */
  parseIdeas(text) {
    if (!text) return [];
    
    console.log(`🔍 [GeminiService] Parsing response text: "${text.substring(0, 200)}..."`);
    
    const lines = text
      .split('\n')
      .map(line => {
        // Remove numbering and bullet points
        let cleaned = line.replace(/^\s*(?:[-*•]+|\d+[\.)])\s*/, '').trim();
        
        // Remove quotes if present
        cleaned = cleaned.replace(/^["']|["']$/g, '');
        
        return cleaned;
      })
      .filter(line => {
        // Filter valid ideas
        return line.length >= 10 && 
               line.length <= 240 && 
               !line.match(/^(I'm|I am|Sorry|Unfortunately|I cannot)/);
      });

    const uniqueLines = [...new Set(lines)];
    const finalIdeas = uniqueLines.slice(0, 5);
    
    console.log(`📝 [GeminiService] Parsed ${finalIdeas.length} valid ideas from ${lines.length} lines`);
    
    return finalIdeas;
  }

  /**
   * Health check method
   */
  async healthCheck() {
    if (!this.genAI || this.modelChain.length === 0) {
      return { status: 'unhealthy', issues: ['Service not initialized'] };
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelChain[0] });
      const result = await Promise.race([
        model.generateContent('Health check'),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 10000))
      ]);
      
      return { status: 'healthy', models: this.modelChain.length };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        issues: [error.message],
        models: this.modelChain.length 
      };
    }
  }
}

// Export singleton instance
module.exports = new GeminiService();
