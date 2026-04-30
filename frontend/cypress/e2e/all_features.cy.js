// all_features.cy.js - Comprehensive E2E Test Suite
// Tests critical money-making flows with zero-tolerance for failure

describe('InfluenceX Critical Flows E2E Tests', () => {
  beforeEach(() => {
    // Clear local storage and cookies before each test
    cy.clearLocalStorage();
    cy.clearCookies();
    
    // Intercept API calls for debugging
    cy.intercept('POST', '/api/auth/login').as('loginRequest');
    cy.intercept('POST', '/api/auth/register').as('registerRequest');
    cy.intercept('GET', '/api/auth/me').as('getUserRequest');
    cy.intercept('POST', '/api/campaigns').as('createCampaignRequest');
    cy.intercept('POST', '/api/deals').as('createDealRequest');
    cy.intercept('POST', '/api/payments').as('paymentRequest');
  });

  // ==================== AUTHENTICATION FLOWS ====================
  
  describe('Authentication Flows', () => {
    it('Should login with valid credentials', () => {
      cy.visit('/login');
      
      // Fill login form
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      
      // Wait for API response
      cy.wait('@loginRequest').its('response.statusCode').should('eq', 200);
      
      // Verify successful login
      cy.url().should('include', '/dashboard');
      cy.get('[data-testid="user-menu"]').should('be.visible');
      
      // Check user data is loaded
      cy.wait('@getUserRequest').its('response.statusCode').should('eq', 200);
    });

    it('Should handle invalid login gracefully', () => {
      cy.visit('/login');
      
      cy.get('[data-testid="email-input"]').type('invalid@example.com');
      cy.get('[data-testid="password-input"]').type('wrongpassword');
      cy.get('[data-testid="login-button"]').click();
      
      cy.wait('@loginRequest').its('response.statusCode').should('eq', 401);
      
      // Should show error message
      cy.get('[data-testid="error-message"]').should('be.visible');
      cy.url().should('include', '/login');
    });

    it('Should register new user successfully', () => {
      cy.visit('/signup');
      
      const randomEmail = `test${Date.now()}@example.com`;
      
      cy.get('[data-testid="name-input"]').type('Test User');
      cy.get('[data-testid="email-input"]').type(randomEmail);
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="user-type-select"]').select('creator');
      cy.get('[data-testid="signup-button"]').click();
      
      cy.wait('@registerRequest').its('response.statusCode').should('eq', 201);
      
      // Should redirect to dashboard or email verification
      cy.url().should('satisfy', (url) => {
        return url.includes('/dashboard') || url.includes('/verify-email');
      });
    });
  });

  // ==================== ADMIN FLOWS ====================
  
  describe('Admin Dashboard Flows', () => {
    beforeEach(() => {
      // Login as admin
      cy.visit('/admin/login');
      cy.get('[data-testid="email-input"]').type('admin@influencex.com');
      cy.get('[data-testid="password-input"]').type('admin123');
      cy.get('[data-testid="login-button"]').click();
      cy.url().should('include', '/admin/dashboard');
    });

    it('Should load admin dashboard with statistics', () => {
      // Check dashboard loads
      cy.get('[data-testid="admin-dashboard"]').should('be.visible');
      
      // Check statistics cards
      cy.get('[data-testid="total-users-stat"]').should('be.visible');
      cy.get('[data-testid="total-campaigns-stat"]').should('be.visible');
      cy.get('[data-testid="total-revenue-stat"]').should('be.visible');
      
      // Verify data is loaded (not showing zeros or loading state)
      cy.get('[data-testid="total-users-stat"]').should('not.contain', '0');
    });

    it('Should manage user accounts', () => {
      cy.visit('/admin/users');
      
      // Check users table loads
      cy.get('[data-testid="users-table"]').should('be.visible');
      cy.get('[data-testid="user-row"]').should('have.length.greaterThan', 0);
      
      // Test user approval/rejection
      cy.get('[data-testid="user-row"]').first().within(() => {
        cy.get('[data-testid="approve-user-btn"]').click();
      });
      
      // Should show success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('Should update platform settings', () => {
      cy.visit('/admin/settings');
      
      // Check settings form loads
      cy.get('[data-testid="settings-form"]').should('be.visible');
      
      // Update email notification settings
      cy.get('[data-testid="email-notifications-toggle"]').click();
      cy.get('[data-testid="save-settings-btn"]').click();
      
      // Should show success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
      
      // Verify settings persist after refresh
      cy.reload();
      cy.get('[data-testid="email-notifications-toggle"]').should('be.checked');
    });
  });

  // ==================== BRAND FLOWS ====================
  
  describe('Brand Campaign & Deal Flows', () => {
    beforeEach(() => {
      // Login as brand
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('brand@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.url().should('include', '/brand/dashboard');
    });

    it('Should create new campaign', () => {
      cy.visit('/brand/campaigns/new');
      
      // Fill campaign form
      cy.get('[data-testid="campaign-title"]').type('Test Campaign ' + Date.now());
      cy.get('[data-testid="campaign-description"]').type('This is a test campaign');
      cy.get('[data-testid="campaign-budget"]').type('5000');
      cy.get('[data-testid="campaign-deadline"]').type('2024-12-31');
      
      // Submit campaign
      cy.get('[data-testid="create-campaign-btn"]').click();
      
      cy.wait('@createCampaignRequest').its('response.statusCode').should('eq', 201);
      
      // Should redirect to campaign details
      cy.url().should('match', /\/brand\/campaigns\/\w+/);
      
      // Verify campaign is created
      cy.get('[data-testid="campaign-title"]').should('contain', 'Test Campaign');
    });

    it('Should create deal for creator', () => {
      cy.visit('/brand/creators');
      
      // Search for creators
      cy.get('[data-testid="creator-search"]').type('test');
      cy.get('[data-testid="creator-card"]').first().click();
      
      // Create deal
      cy.get('[data-testid="create-deal-btn"]').click();
      cy.get('[data-testid="deal-offer-amount"]').type('1000');
      cy.get('[data-testid="deal-deliverables"]').type('Instagram post, Story');
      cy.get('[data-testid="send-deal-btn"]').click();
      
      cy.wait('@createDealRequest').its('response.statusCode').should('eq', 201);
      
      // Should show success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('Should process payments successfully', () => {
      cy.visit('/brand/payments');
      
      // Check payments history
      cy.get('[data-testid="payments-table"]').should('be.visible');
      
      // Initiate new payment
      cy.get('[data-testid="make-payment-btn"]').click();
      cy.get('[data-testid="payment-amount"]').type('500');
      cy.get('[data-testid="payment-method"]').select('stripe');
      cy.get('[data-testid="confirm-payment-btn"]').click();
      
      // Should redirect to payment provider or show success
      cy.url().should('satisfy', (url) => {
        return url.includes('stripe.com') || url.includes('/payments/success');
      });
    });
  });

  // ==================== CREATOR FLOWS ====================
  
  describe('Creator Deal & Earnings Flows', () => {
    beforeEach(() => {
      // Login as creator
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('creator@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      cy.url().should('include', '/creator/dashboard');
    });

    it('Should view and accept available deals', () => {
      cy.visit('/creator/available-deals');
      
      // Check deals load
      cy.get('[data-testid="deals-list"]').should('be.visible');
      cy.get('[data-testid="deal-card"]').should('have.length.greaterThan', 0);
      
      // Accept a deal
      cy.get('[data-testid="deal-card"]').first().within(() => {
        cy.get('[data-testid="accept-deal-btn"]').click();
      });
      
      // Should show confirmation modal
      cy.get('[data-testid="confirm-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-accept-btn"]').click();
      
      // Should show success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });

    it('Should submit deliverables', () => {
      cy.visit('/creator/deals');
      
      // Go to active deal
      cy.get('[data-testid="deal-card"]').first().click();
      cy.url().should('match', /\/creator\/deals\/\w+/);
      
      // Submit deliverable
      cy.get('[data-testid="submit-deliverable-btn"]').click();
      cy.get('[data-testid="deliverable-file"]').attachFile('test-image.jpg');
      cy.get('[data-testid="deliverable-description"]').type('Completed Instagram post');
      cy.get('[data-testid="submit-btn"]').click();
      
      // Should show success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
      
      // Verify deliverable appears in list
      cy.get('[data-testid="deliverable-item"]').should('be.visible');
    });

    it('Should request withdrawal', () => {
      cy.visit('/creator/earnings');
      
      // Check earnings display
      cy.get('[data-testid="total-earnings"]').should('be.visible');
      cy.get('[data-testid="available-balance"]').should('be.visible');
      
      // Request withdrawal
      cy.get('[data-testid="withdrawal-btn"]').click();
      cy.get('[data-testid="withdrawal-amount"]').type('100');
      cy.get('[data-testid="withdrawal-method"]').select('paypal');
      cy.get('[data-testid="confirm-withdrawal-btn"]').click();
      
      // Should show success message
      cy.get('[data-testid="success-toast"]').should('be.visible');
    });
  });

  // ==================== ERROR HANDLING ====================
  
  describe('Error Handling & Edge Cases', () => {
    it('Should handle network errors gracefully', () => {
      // Simulate network failure
      cy.intercept('GET', '/api/auth/me', { forceNetworkError: true });
      
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      
      // Should show network error message
      cy.get('[data-testid="error-message"]').should('contain', 'network');
    });

    it('Should handle unauthorized access', () => {
      // Try to access protected route without login
      cy.visit('/brand/dashboard');
      
      // Should redirect to login
      cy.url().should('include', '/login');
    });

    it('Should validate form inputs', () => {
      cy.visit('/signup');
      
      // Submit empty form
      cy.get('[data-testid="signup-button"]').click();
      
      // Should show validation errors
      cy.get('[data-testid="validation-error"]').should('have.length.greaterThan', 0);
      
      // Test invalid email
      cy.get('[data-testid="email-input"]').type('invalid-email');
      cy.get('[data-testid="email-error"]').should('be.visible');
    });
  });

  // ==================== PERFORMANCE TESTS ====================
  
  describe('Performance Tests', () => {
    it('Should load dashboard within performance budget', () => {
      cy.visit('/login');
      cy.get('[data-testid="email-input"]').type('test@example.com');
      cy.get('[data-testid="password-input"]').type('password123');
      cy.get('[data-testid="login-button"]').click();
      
      // Measure dashboard load time
      cy.window().then((win) => {
        const startTime = win.performance.now();
        cy.url().should('include', '/dashboard').then(() => {
          const endTime = win.performance.now();
          const loadTime = endTime - startTime;
          
          // Should load within 3 seconds
          expect(loadTime).to.be.lessThan(3000);
        });
      });
    });

    it('Should handle large data sets efficiently', () => {
      // Test with large campaign/deal lists
      cy.visit('/brand/campaigns');
      
      // Should not freeze with many items
      cy.get('[data-testid="campaigns-table"]').should('be.visible');
      cy.get('[data-testid="loading-spinner"]').should('not.exist');
    });
  });

  // ==================== SECURITY TESTS ====================
  
  describe('Security Tests', () => {
    it('Should prevent XSS attacks', () => {
      cy.visit('/signup');
      
      // Try XSS payload
      const xssPayload = '<script>alert("xss")</script>';
      cy.get('[data-testid="name-input"]').type(xssPayload);
      cy.get('[data-testid="signup-button"]').click();
      
      // Should sanitize input
      cy.get('[data-testid="name-input"]').should('not.contain', '<script>');
    });

    it('Should handle CSRF protection', () => {
      // Verify CSRF token is present
      cy.visit('/login');
      cy.get('meta[name="csrf-token"]').should('exist');
    });

    it('Should enforce rate limiting', () => {
      cy.visit('/login');
      
      // Try multiple rapid login attempts
      for (let i = 0; i < 10; i++) {
        cy.get('[data-testid="login-button"]').click();
      }
      
      // Should show rate limit error
      cy.get('[data-testid="error-message"]').should('contain', 'too many');
    });
  });
});
