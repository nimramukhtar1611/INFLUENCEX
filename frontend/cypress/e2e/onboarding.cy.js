describe('M2 Onboarding Flow', () => {
  beforeEach(() => {
    cy.mockAppShell();
    // Mock additional API calls that signup page might need
    cy.intercept('GET', '**/api/settings/global*', {
      statusCode: 200,
      body: {
        success: true,
        settings: {
          platformName: 'InfluenceX',
          emailVerificationRequired: false,
          phoneVerificationRequired: false,
          passwordMinLength: 8,
          passwordRequirements: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false
          }
        }
      }
    }).as('getGlobalSettings');
  });

  it('validates required fields in signup step 1', () => {
    cy.visit('/signup');
    cy.wait(2000); // Wait for page to load
    cy.get('body').should('be.visible');
    
    // Check if page loaded - wait for elements to exist
    cy.get('input[name="fullName"]', { timeout: 10000 }).should('be.visible');
    cy.get('input[name="email"]').should('be.visible');
    cy.get('input[name="password"]').should('be.visible');

    // Try to continue without filling form
    cy.contains('button', 'Continue').click();

    // Check validation - the form should show validation errors
    cy.get('input[name="fullName"]').invoke('prop', 'validity').should('have.property', 'valid', false);
  });

  it('shows brand onboarding fields in step 2', () => {
    cy.visit('/signup');
    cy.wait(2000); // Wait for page to fully render
    
    // Look for Brand selection using different approaches
    cy.get('body').then(($body) => {
      if ($body.find('p:contains("Brand")').length > 0) {
        cy.contains('p', 'Brand').click();
      } else if ($body.find('button:contains("Brand")').length > 0) {
        cy.contains('button', 'Brand').click();
      } else {
        // Try to find Brand in any element
        cy.contains('Brand').click();
      }
    });

    // Fill the form
    cy.get('input[name="fullName"]').type('Brand Owner');
    cy.get('input[name="email"]').type('brand@acme.com');
    cy.get('input[name="password"]').type('SecurePass1');
    cy.get('input[name="confirmPassword"]').type('SecurePass1');
    cy.contains('button', 'Continue').click();

    // Check brand-specific fields
    cy.contains('Brand Name').should('be.visible');
    cy.contains('Industry').should('be.visible');
  });

  it('shows creator onboarding fields in step 2', () => {
    cy.visit('/signup?type=creator');
    cy.wait(2000); // Wait for page to fully render
    
    // Look for Creator selection using different approaches
    cy.get('body').then(($body) => {
      if ($body.find('p:contains("Creator")').length > 0) {
        cy.contains('p', 'Creator').click();
      } else if ($body.find('button:contains("Creator")').length > 0) {
        cy.contains('button', 'Creator').click();
      } else {
        // Try to find Creator in any element
        cy.contains('Creator').click();
      }
    });

    // Fill the form
    cy.get('input[name="fullName"]').type('Creator User');
    cy.get('input[name="email"]').type('creator@example.com');
    cy.get('input[name="password"]').type('SecurePass1');
    cy.get('input[name="confirmPassword"]').type('SecurePass1');
    cy.contains('button', 'Continue').click();

    // Check creator-specific fields
    cy.contains('Display Name').should('be.visible');
    cy.contains('Handle').should('be.visible');
    cy.contains('Niche').should('be.visible');
  });
});
