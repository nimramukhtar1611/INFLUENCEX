console.log("🔧 VERIFYING SECURITY POLICIES REMOVAL");
console.log("===================================");

try {
  const fs = require('fs');
  const filePath = './frontend/src/pages/Admin/Settings.jsx';
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check for specific elements that should be removed
  const securityPoliciesText = content.includes('Security Policies');
  const emailVerificationToggle = content.includes('Require email verification for new accounts');
  const emailVerificationButton = content.includes('setFormData({...formData, emailVerification:');
  
  console.log("📋 Security Policies text present:", securityPoliciesText);
  console.log("📋 Email verification toggle text present:", emailVerificationToggle);
  console.log("📋 Email verification button present:", emailVerificationButton);
  
  if (!securityPoliciesText && !emailVerificationToggle && !emailVerificationButton) {
    console.log("\n✅ SUCCESS: Security Policies section completely removed!");
    console.log("✅ Admin settings no longer shows Security Policies");
    console.log("✅ Email verification toggle removed");
    console.log("✅ Interface simplified");
  } else {
    console.log("\n⚠️ Some elements still present:");
    if (securityPoliciesText) console.log("- Security Policies text still exists");
    if (emailVerificationToggle) console.log("- Email verification toggle text still exists");
    if (emailVerificationButton) console.log("- Email verification button still exists");
  }
  
} catch (error) {
  console.log("❌ Error:", error.message);
}
