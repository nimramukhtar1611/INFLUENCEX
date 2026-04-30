# Authentication Flow Test Guide

## Environment Setup

1. **Backend Environment Configuration:**
   - Copy `.env.local` to `.env` in the backend directory
   - Update the following variables:
     - `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` for email functionality
     - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` for SMS
     - `FRONTEND_URL` should match your frontend URL (default: http://localhost:3000)

2. **Frontend Environment:**
   - Ensure frontend is running on port 3000
   - Check that API calls are correctly routed to backend (port 5000)

## Testing Checklist

### 1. Forgot Password Flow
- [ ] Navigate to `/forgot-password`
- [ ] Enter a valid email address
- [ ] Submit form and check console logs for debugging info
- [ ] Verify email is sent (check logs or actual email)
- [ ] Click reset link in email
- [ ] Reset password with new credentials
- [ ] Verify login works with new password

### 2. Email OTP Flow
- [ ] Navigate to signup page
- [ ] Enter email and proceed to OTP verification
- [ ] Check console logs for OTP generation
- [ ] Verify OTP is sent to email
- [ ] Enter OTP code and verify functionality
- [ ] Test resend functionality after 60 seconds

### 3. Phone OTP Flow
- [ ] Enter phone number during signup
- [ ] Request phone OTP
- [ ] Check console logs for SMS sending status
- [ ] Verify OTP input functionality
- [ ] Test phone verification

### 4. 2FA Flow
- [ ] Enable 2FA for a user account
- [ ] Attempt login with correct credentials
- [ ] Verify 2FA challenge is presented
- [ ] Test 2FA code verification

## Debugging Information

### Console Logs to Monitor:
1. **Backend Console:**
   - `Forgot password request started`
   - `Email service configured`
   - `Password reset URL generated`
   - `Send OTP request started`
   - `SMS service configured`

2. **Frontend Console:**
   - API call responses
   - OTP input handling
   - Navigation flow

### Common Issues & Solutions:

1. **Emails Not Sending:**
   - Check email credentials in `.env`
   - Verify SMTP settings (Gmail requires App Password)
   - Check console for email service errors

2. **SMS Not Sending:**
   - Verify Twilio credentials
   - Check phone number format (+countrycode)
   - Monitor SMS service logs

3. **OTP Input Issues:**
   - Verify auto-focus works between fields
   - Check paste functionality
   - Ensure submit button enables with 6 digits

4. **Link Formatting:**
   - Verify `FRONTEND_URL` is correctly set
   - Check reset link format in emails
   - Test navigation to reset page

## Files Modified

### Backend:
- `controllers/authController.js` - Added comprehensive debugging logs
- `services/emailService.js` - Fixed URL generation and added logging
- `.env.local` - Created environment template

### Frontend:
- `pages/Auth/ForgotPassword.jsx` - Applied zinc theme and Playfair Display
- `pages/Auth/Login.jsx` - Applied zinc theme and Playfair Display
- `components/Auth/OTPVerification.jsx` - Applied zinc theme and improved UX

## Color Scheme Applied:
- **Background:** `#18181b` (zinc-900)
- **Borders:** `#27272a` (zinc-800)
- **Text Primary:** `#f4f4f5` (zinc-100)
- **Text Secondary:** `#a1a1aa` (zinc-400)
- **Text Muted:** `#71717a` (zinc-500)

## Typography:
- **Headings:** Playfair Display font with proper letter-spacing
- **Body:** System fonts with proper hierarchy

## Next Steps:
1. Configure actual email/SMS credentials
2. Test end-to-end flows
3. Monitor console logs for any errors
4. Verify responsive design on mobile devices
