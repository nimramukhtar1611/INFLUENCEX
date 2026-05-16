# InfluenceX — User Manual
Version 1.0 | May 9, 2026
Based on live source code analysis

---

## 1. Introduction

### What is InfluenceX?
InfluenceX is a comprehensive influencer marketing platform that connects brands with content creators for collaborative marketing campaigns. The platform facilitates campaign creation, deal negotiation, content delivery, payment processing, and performance tracking all in one centralized system.

### Platform URL and Access Points
- **Main Platform**: `http://13.61.13.2:5173` (Production)
- **Admin Portal**: `/admin/login`
- **API Base**: `/api`
- **Health Check**: `/health`

### User Roles Overview

| Role | Who they are | What they do |
|------|-------------|--------------|
| **Creator** | Content creators, influencers, social media personalities | Create profiles, browse campaigns, apply for deals, submit deliverables, track earnings |
| **Brand** | Businesses, marketing agencies, brands | Create campaigns, find creators, manage deals, process payments, track ROI |
| **Admin** | Platform administrators, moderators | Manage users, review content, handle disputes, configure platform settings |
| **Super Admin** | System administrators | Full platform control, user management, system configuration |

---

## 2. Public Pages (No Login Required)

### Home / Landing Page (/)
- **Hero Section**: Platform value proposition and main CTAs
- **Features Overview**: Key platform capabilities
- **How It Works**: Step-by-step process explanation
- **Testimonials**: User success stories
- **Statistics**: Platform metrics (users, campaigns, earnings)
- **CTA Buttons**: "Sign up as Creator", "Sign up as Brand"

### Browse / Explore Page (/search)
- **Search Bar**: Keyword search for creators/campaigns
- **Filters**:
  - Categories: Fashion, Beauty, Technology, Food & Beverage, Fitness, Travel, Gaming, Lifestyle, Parenting, Finance, Education, Entertainment, Sports, Automotive, Real Estate, Health, Wellness, Other
  - Follower Range: Min/Max followers
  - Engagement Rate: Minimum engagement percentage
  - Platforms: Instagram, YouTube, TikTok, Facebook
  - Location: Geographic filtering
  - Age Groups: 18-24, 25-34, 35-44, 45+
  - Gender: Male, Female, All
- **Sorting Options**: Followers, Engagement, Recent, Rating
- **Pagination**: 20 results per page
- **Creator Cards**: Profile picture, name, handle, stats, niches

### Creator Profile View (/creators/:id)
- **Profile Information**: Display name, handle, bio, location
- **Social Media Stats**: Platform-specific follower counts and engagement
- **Portfolio**: Previous work samples
- **Rate Card**: Pricing for different content types
- **Audience Demographics**: Age groups, gender distribution, top countries
- **Verification Status**: Verified checkmarks for platforms
- **Contact Button**: For brands to reach out

### Brand Profile View (/brands/:id)
- **Company Information**: Brand name, industry, description, website
- **Campaign History**: Past and active campaigns
- **Statistics**: Total spent, average ROI, creator ratings
- **Team Members**: Key team members and their roles
- **Verification Status**: Platform verification badge

### Pricing Page (/pricing) [COMING SOON]
- **Plan Tiers**: Creator plans (Free, Professional, Enterprise), Brand plans
- **Feature Comparison**: Feature matrix across plans
- **Pricing**: Monthly/annual subscription costs
- **FAQ**: Common pricing questions
- **Upgrade CTA**: Plan selection and upgrade flow

### Support & Help Pages
- **FAQs** (/faqs): Frequently asked questions
- **Privacy Policy** (/privacypolicy): Data handling policies
- **Terms of Service** (/terms): Platform terms and conditions

---

## 3. Account & Authentication

### Registration Flow (/signup)
1. **Account Type Selection**: Choose "Creator" or "Brand"
2. **Basic Information**:
   - Email (required, unique)
   - Password (min 8 characters)
   - Full Name (required)
   - Phone Number (optional)
3. **Role-Specific Information**:
   - **Creators**: Display name, handle, bio, social media links
   - **Brands**: Brand name, industry, website, company size
4. **Terms Acceptance**: Privacy Policy and Terms of Service checkboxes
5. **Email Verification**: OTP sent to registered email
6. **Phone Verification** (optional): SMS verification for enhanced security

### Email Verification (/verify-email)
- **OTP Input**: 6-digit code sent via email
- **Resend Option**: Request new code after 60 seconds
- **Expiry**: Code expires in 10 minutes
- **Auto-redirect**: Successful verification redirects to dashboard

### Phone Verification
- **SMS OTP**: 6-digit code sent to phone
- **Voice Backup**: Option for automated voice call
- **Resend Limit**: Maximum 3 attempts per hour

### Login (/login)
- **Fields**: Email and password
- **Remember Me**: 30-day session persistence
- **Social Login**: [COMING SOON] Google, Facebook, LinkedIn integration
- **Rate Limiting**: 5 attempts per 15 minutes
- **Account Lock**: Temporary lock after 5 failed attempts (30 minutes)

### Forgot Password (/forgot-password)
- **Email Input**: Send reset link to registered email
- **Security Questions**: [COMING SOON] Additional verification layer
- **Rate Limiting**: 3 requests per hour per email

### Password Reset (/reset-password)
- **Token Validation**: Verify reset token from email
- **New Password**: Minimum 8 characters, complexity requirements
- **Confirmation**: Re-enter new password
- **Token Expiry**: Reset links expire in 1 hour

### Two-Factor Authentication (2FA) (/2fa-verify)
- **Setup Process**:
  1. Scan QR code with authenticator app
  2. Enter backup codes (save securely)
  3. Verify with current code
- **Login Flow**: After password, enter 6-digit TOTP code
- **Backup Codes**: 10 one-time use codes
- **Methods**: App (Google Authenticator), SMS, Email
- **Recovery**: Account recovery with backup codes

### Admin Login (/admin/login)
- **Separate Portal**: Dedicated admin authentication
- **Enhanced Security**: Required 2FA for all admin accounts
- **Session Management**: Extended session timeouts
- **Activity Logging**: All admin actions logged

---

## 4. Dashboard Overview

### Sidebar Navigation by Role

| Role | Navigation Links |
|------|------------------|
| **Creator** | Dashboard, Available Deals, My Deals, Deliverables, Earnings, Withdrawals, Profile, Settings, Inbox, Notifications, Growth OS [Premium] |
| **Brand** | Dashboard, Campaigns, Search Creators, Deals, Payments, Profile, Settings, Inbox, Notifications, Subscription |
| **Admin** | Dashboard, Users, Brands, Creators, Campaigns, Deals, Payments, Reports, Settings, Disputes, Fraud Review, Notifications |

### Creator Dashboard (/creator/dashboard)
- **Stats Cards**:
  - Total Earnings: Lifetime revenue
  - Active Deals: Current ongoing campaigns
  - Pending Applications: Awaiting response
  - Average Rating: Creator performance score
- **Charts**:
  - Earnings Trend: Monthly revenue chart
  - Deal Status Breakdown: Active, completed, pending
  - Platform Performance: Engagement metrics
- **Quick Actions**:
  - Browse Available Deals
  - Update Profile
  - Withdraw Earnings
- **Alert Banners**: New deals, payment notifications, profile incomplete

### Brand Dashboard (/brand/dashboard)
- **Stats Cards**:
  - Total Campaigns: Created campaigns count
  - Active Campaigns: Currently running
  - Total Spent: Platform expenditure
  - Average ROI: Campaign performance
- **Charts**:
  - Spending Trend: Monthly campaign budget
  - Campaign Performance: ROI by campaign
  - Creator Engagement: Deal acceptance rates
- **Quick Actions**:
  - Create New Campaign
  - Search Creators
  - View Active Deals
- **Alert Banners**: Campaign deadlines, low budget alerts, new applications

### Admin Dashboard (/admin/dashboard)
- **System Stats**:
  - Total Users: Platform user count by type
  - Active Campaigns: Live campaigns
  - Total Revenue: Platform earnings
  - Pending Reviews: Content awaiting moderation
- **Charts**:
  - User Growth: New registrations over time
  - Revenue Breakdown: Income sources
  - Activity Metrics: Platform usage statistics
- **Quick Actions**:
  - Review New Users
  - Monitor Active Campaigns
  - Handle Disputes
- **System Alerts**: Security issues, performance problems

---

## 5. Campaigns

### Campaign List View (/brand/campaigns)
- **Columns**: Title, Status, Budget, Start Date, End Date, Applications, Performance
- **Status Filters**: Draft, Pending, Active, Paused, Completed, Archived, Rejected
- **Search**: By campaign title or description
- **Sorting**: By date, budget, performance
- **Bulk Actions**: Archive multiple campaigns
- **Pagination**: 20 campaigns per page

### Create Campaign (/brand/campaigns/new)
1. **Basic Information**:
   - Campaign Title (required, 5-100 characters)
   - Description (required, 20-2000 characters)
   - Category (required): Industry selection
   - Campaign Objectives: Multiple objectives allowed

2. **Budget & Timeline**:
   - Total Budget (required, $10-$1,000,000)
   - Budget Type: Fixed, Outcome-based, Hourly, Milestone
   - Payment Terms: Escrow, Half upfront, Full upfront, Milestone
   - Start Date (required)
   - End Date (required)
   - Submission Deadline (optional)

3. **Target Audience**:
   - Follower Range: Min/max followers
   - Minimum Engagement: 0-100%
   - Geographic Locations: Country targeting
   - Age Groups: 18-24, 25-34, 35-44, 45+
   - Gender Targeting: Male, Female, All
   - Niches: Multiple category selection
   - Platforms: Instagram, YouTube, TikTok, Facebook

4. **Deliverables**:
   - Content Type: Post, Story, Reel, Video, Blog, Review, Image, Other
   - Platform: Where content will be published
   - Quantity: Number of pieces required
   - Description: Detailed requirements
   - Budget: Allocation per deliverable

5. **Requirements**:
   - Specific instructions for creators
   - Brand guidelines and restrictions
   - Hashtag requirements
   - Mention requirements

6. **Brand Assets**:
   - Upload logos, product images, guidelines
   - File types: Image, Video, Document, Other
   - File size limit: 50MB per file

### Campaign Details (/brand/campaigns/:id)
- **Campaign Overview**: All campaign information
- **Applications List**: Creator applications with proposals
- **Selected Creators**: Accepted creators and their deals
- **Performance Metrics**: Campaign ROI and engagement
- **Timeline**: Key campaign events and milestones
- **Actions**: Edit, Pause, Complete, Archive

### Edit Campaign (/brand/campaigns/:id/edit)
- **Same Fields as Creation**: All campaign details editable
- **Status Restrictions**: Cannot edit active campaigns (only pause)
- **Budget Changes**: Require creator notification for active deals
- **Deadline Extensions**: Automatic notifications to affected creators

### Campaign Status Management
- **Draft**: Initial state, not visible to creators
- **Pending**: Under review by admin
- **Active**: Live and accepting applications
- **Paused**: Temporarily suspended, not accepting applications
- **Completed**: Finished, no longer active
- **Archived**: Hidden from main view but accessible
- **Rejected**: Denied by admin, not publishable

---

## 6. Deals

### Deal Management Flow

#### For Brands (/brand/deals)
- **Deal List**: All deals associated with brand campaigns
- **Status Filters**: Pending, Accepted, In Progress, Completed, Cancelled, Disputed
- **Creator Information**: Profile links and communication history
- **Budget Tracking**: Deal amounts and payment status
- **Performance Metrics**: ROI and engagement data

#### For Creators (/creator/deals)
- **My Deals**: All active and historical deals
- **Available Deals**: Marketplace of open opportunities
- **Application Status**: Tracking of submitted proposals
- **Earnings**: Deal-specific payment information
- **Deliverables**: Content submission tracking

### Deal Creation (/brand/createdeal)
1. **Campaign Selection**: Choose existing campaign or create new
2. **Creator Search**: Find and select target creators
3. **Deal Terms**:
   - Budget Amount: Fixed or performance-based
   - Payment Type: Fixed, CPE, CPA, CPM, Revenue Share, Hybrid
   - Deliverables: Specific content requirements
   - Timeline: Start date and deadline
   - Special Requirements: Custom instructions

4. **Performance Metrics (if applicable)**:
   - CPE: Target likes, comments, shares, saves
   - CPA: Target conversions and commission rate
   - CPM: Target impressions and CPM rate
   - Revenue Share: Percentage and minimum guarantee

5. **Negotiation Settings**:
   - Manual: Traditional back-and-forth negotiation
   - AI: Automated negotiation based on market rates
   - Initial Budget: Starting point for negotiations

### Deal Details (/brand/deals/:id or /creator/deals/:id)
- **Deal Information**: All terms and conditions
- **Participants**: Brand and creator profiles
- **Deliverables**: List with status tracking
- **Communication**: Message history and negotiation notes
- **Performance**: Real-time metrics and ROI data
- **Payment Status**: Escrow, released, refunded, etc.
- **Timeline**: Complete deal history

### Deal Status Transitions
- **Pending**: Initial state, awaiting response
- **Negotiating**: Terms being discussed
- **Accepted**: Both parties agreed to terms
- **In Progress**: Work being completed
- **Revision**: Content needs changes
- **Completed**: All deliverables approved
- **Cancelled**: Terminated by mutual agreement
- **Disputed**: Resolution required
- **Overdue**: Deadline passed without completion

### Performance Tracking
- **Metrics Collection**: Automatic tracking from social platforms
- **Real-time Updates**: Live performance data
- **ROI Calculation**: Automated return on investment
- **Historical Data**: Performance trends over time
- **Comparative Analysis**: Benchmarks against similar deals

---

## 7. Deliverables

### Deliverable Management (/creator/deliverables/:dealId)
- **Deliverable List**: All required content pieces
- **Status Tracking**: Pending, In Progress, Submitted, Approved, Revision
- **File Upload**: Direct upload to platform
- **Link Submission**: External content links
- **Version History**: Track revisions and changes
- **Feedback System**: Brand comments and revision requests

### Content Submission
1. **Select Deliverable**: Choose from required list
2. **Upload Files**:
   - Supported formats: Image, Video, PDF, Other
   - Maximum file size: 100MB per file
   - Multiple files allowed per deliverable
3. **Add Links**: External content URLs (social media posts)
4. **Submit for Review**: Send to brand for approval
5. **Revision Process**: Handle feedback and resubmit if needed

### Approval Workflow
- **Brand Review**: Evaluate submitted content against requirements
- **Approval Options**: Approve, Request Revision, Reject
- **Feedback System**: Detailed comments and revision notes
- **Revision Limits**: Maximum 3 revisions per deliverable
- **Final Approval**: Mark as complete and trigger payment

---

## 8. Payments & Billing

### Payment Processing
- **Payment Gateway**: Stripe integration for secure processing
- **Supported Currencies**: USD, EUR, GBP, INR, AUD, CAD
- **Payment Methods**: Credit Card, Bank Transfer, PayPal
- **Escrow System**: Funds held until deliverable approval
- **Fee Structure**: Platform commission on successful deals

### Payment Flow
1. **Deal Acceptance**: Funds transferred to escrow
2. **Deliverable Submission**: Content reviewed by brand
3. **Approval Confirmation**: Brand approves completed work
4. **Payment Release**: Funds transferred to creator
5. **Platform Fee**: Commission deducted automatically
6. **Payout Processing**: Creator can withdraw earnings

### Payment Status Tracking
- **Pending**: Payment initiated but not processed
- **In Escrow**: Funds held awaiting approval
- **Released**: Payment sent to creator
- **Refunded**: Payment returned to brand
- **Failed**: Processing error occurred
- **Partially Refunded**: Partial refund processed
- **Processing**: Payment being processed
- **On Hold**: Payment temporarily suspended
- **Available**: Ready for withdrawal

### Creator Earnings (/creator/earnings)
- **Total Earnings**: Lifetime revenue
- **Available Balance**: Ready for withdrawal
- **Pending Earnings**: Awaiting approval/processing
- **Withdrawal History**: Past withdrawal requests
- **Performance Bonuses**: Additional earnings from performance-based deals

### Withdrawals (/creator/withdrawals)
- **Withdrawal Methods**: Bank transfer, PayPal
- **Minimum Amount**: $10 minimum withdrawal
- **Processing Time**: 3-5 business days
- **Fees**: Processing fees may apply
- **Withdrawal History**: Complete transaction history

### Brand Payments (/brand/payments)
- **Payment History**: All transactions and refunds
- **Budget Tracking**: Campaign spending vs. budget
- **Invoice Generation**: Downloadable invoices
- **Tax Information**: Tax documents and receipts
- **Payment Methods**: Manage saved payment methods

---

## 9. Messaging & Communication

### Inbox System (/brand/inbox or /creator/inbox)
- **Conversation List**: All message threads
- **Unread Count**: Badge notification for new messages
- **Search**: Find specific conversations
- **Filters**: By sender, date, status
- **Bulk Actions**: Mark as read, archive, delete

### Message Features
- **Real-time Chat**: Socket.io powered instant messaging
- **File Attachments**: Share images, documents, videos
- **Link Sharing**: Send URLs and resources
- **Message History**: Complete conversation archive
- **Read Receipts**: See when messages are read
- **Typing Indicators**: Real-time typing status

### Deal Negotiation
- **Integrated Chat**: Negotiate deals within conversation
- **Proposal System**: Formal deal proposals
- **Counter Offers**: Respond to proposals with changes
- **AI Assistance**: [Premium] AI-powered negotiation suggestions
- **Agreement Tracking**: Final terms recorded and binding

### Notifications
- **Push Notifications**: Real-time alerts for new messages
- **Email Notifications**: Optional email summaries
- **SMS Alerts**: Important message notifications
- **In-App Alerts**: Toast notifications and badge updates

---

## 10. Notifications

### Notification Center (/notifications)
- **Notification List**: Chronological list of all notifications
- **Filtering**: By type, date, read status
- **Bulk Actions**: Mark all as read, clear notifications
- **Settings**: Configure notification preferences

### Notification Types

| Type | Triggered by | Delivered to |
|------|---------------|--------------|
| **New Deal** | Brand creates deal targeting creator | Creator |
| **Application Received** | Creator applies for campaign | Brand |
| **Application Status** | Brand accepts/rejects application | Creator |
| **Deal Update** | Deal status changes | Both parties |
| **Payment Received** | Payment processed | Creator |
| **Deliverable Submitted** | Creator submits content | Brand |
| **Content Approved** | Brand approves deliverable | Creator |
| **Revision Requested** | Brand requests changes | Creator |
| **Message Received** | New chat message | Both parties |
| **System Alert** | Platform updates | All users |
| **Security Alert** | Account security events | User |

### Notification Preferences
- **Email Notifications**: Toggle by category
- **Push Notifications**: Browser and mobile push settings
- **SMS Notifications**: Critical alerts only
- **In-App Notifications**: Real-time display preferences
- **Frequency Controls**: Daily digest vs. immediate alerts

---

## 11. Reviews & Ratings

### Rating System
- **5-Star Scale**: Overall rating from 1-5 stars
- **Criteria Breakdown**:
  - Communication: Responsiveness and clarity
  - Quality: Content quality and adherence to requirements
  - Timeliness: Meeting deadlines and response time
  - Professionalism: Overall professional conduct

### Review Process
1. **Deal Completion**: Automatic review request sent
2. **Rating Submission**: Rate partner on all criteria
3. **Written Review**: Optional detailed feedback
4. **Review Display**: Shown on public profiles
5. **Response Option**: Reply to received reviews

### Rating Display
- **Average Rating**: Calculated from all reviews
- **Total Reviews**: Number of reviews received
- **Criteria Scores**: Breakdown by category
- **Recent Reviews**: Latest feedback displayed prominently
- **Review History**: Complete review archive

---

## 12. Analytics & Reports

### Creator Analytics (/creator/analytics)
- **Performance Metrics**:
  - Earnings Trend: Monthly revenue chart
  - Deal Success Rate: Percentage of completed deals
  - Average Rating: Quality score over time
  - Response Time: Average response to messages

- **Audience Insights**:
  - Follower Growth: Social media follower trends
  - Engagement Rates: Platform-specific engagement
  - Demographic Data: Audience age, gender, location
  - Content Performance: Best-performing content types

### Brand Analytics (/brand/analytics)
- **Campaign Performance**:
  - ROI Analysis: Return on investment by campaign
  - Cost Metrics: CPE, CPA, CPM calculations
  - Conversion Tracking: Goal completion rates
  - Engagement Data: Audience interaction metrics

- **Creator Performance**:
  - Creator Rankings: Top performing creators
  - Deal Success Rates: Creator reliability metrics
  - Content Quality: Average ratings by creator
  - Cost Efficiency: Best value creators

### Admin Reports (/admin/reports)
- **System Metrics**:
  - User Growth: Registration trends
  - Revenue Reports: Platform income analysis
  - Activity Statistics: Platform usage patterns
  - Performance Monitoring: System health metrics

- **Compliance Reports**:
  - Content Moderation: Removed content statistics
  - Fraud Detection: Suspicious activity reports
  - Dispute Resolution: Conflict resolution outcomes
  - Audit Logs: Administrative actions

### Export Options
- **CSV Export**: Download data in CSV format
- **PDF Reports**: Generate formatted PDF reports
- **Scheduled Reports**: Automated email delivery
- **Custom Date Ranges**: Flexible time period selection
- **Data Filtering**: Export specific data subsets

---

## 13. Documents & Media

### File Upload System
- **Supported File Types**:
  - Images: JPG, PNG, GIF, WebP (max 10MB)
  - Videos: MP4, MOV, AVI (max 100MB)
  - Documents: PDF, DOC, DOCX (max 25MB)
  - Other: ZIP files for multiple assets

- **Storage Provider**: Cloudinary integration
- **Upload Limits**: 50MB per file, 500MB total per user
- **Automatic Compression**: Image optimization and video transcoding
- **CDN Distribution**: Fast global content delivery

### Media Management
- **File Organization**: Folder structure for different content types
- **Version Control**: Track multiple versions of files
- **Preview System**: thumbnails and previews for all file types
- **Sharing Options**: Generate shareable links for files
- **Access Control**: Permission-based file access

### Brand Assets
- **Logo Upload**: Company logos in various formats
- **Product Images**: High-quality product photography
- **Brand Guidelines**: PDF documents with brand standards
- **Template Files**: Pre-designed templates for creators
- **Asset Library**: Centralized storage for all brand materials

### Creator Portfolio
- **Work Samples**: Previous campaign examples
- **Performance Data**: Screenshots of analytics
- **Testimonials**: Client recommendations
- **Media Kit**: Professional presentation materials
- **Portfolio Organization**: Categorize by industry or platform

---

## 14. Profile Settings

### Profile Management (/brand/profile or /creator/profile)
- **Basic Information**:
  - Name/Display Name: Public identifier
  - Email: Contact email (can be different from login)
  - Phone: Optional contact number
  - Location: Geographic location
  - Website: Personal or business website

- **Profile Details**:
  - **Creators**: Bio, niches, social media handles, rate card
  - **Brands**: Brand description, industry, company size, founding year
  - **Both**: Profile picture, cover image, social media links

### Security Settings
- **Password Change**: Update account password
- **Two-Factor Authentication**: Enable/disable 2FA
- **Login History**: Recent login attempts and locations
- **Connected Accounts**: Linked social media accounts
- **Session Management**: Active sessions and logout options

### Privacy Settings
- **Profile Visibility**: Public, private, or team-only
- **Contact Information**: Show/hide email and phone
- **Activity Status**: Display online/last active status
- **Data Sharing**: Control data sharing with third parties
- **Search Visibility**: Appear in search results

### Notification Preferences
- **Email Notifications**: Toggle by category
- **Push Notifications**: Browser and mobile settings
- **SMS Notifications**: Critical alerts only
- **In-App Notifications**: Real-time display preferences
- **Frequency Controls**: Immediate vs. digest options

---

## 15. Role-Specific Features

### Creator Growth OS (/creator/growth-os) [PROFESSIONAL+]
- **AI-Powered Insights**: Content performance analysis
- **Growth Recommendations**: Platform-specific growth strategies
- **Competitor Analysis**: Compare with similar creators
- **Content Optimization**: AI suggestions for better engagement
- **Audience Analytics**: Deep audience demographic insights
- **Earnings Projection**: Predict future earnings based on trends

### Brand Team Management
- **Team Invitations**: Invite team members with specific roles
- **Permission System**: Granular access control by role
- **Activity Tracking**: Monitor team member activities
- **Collaboration Tools**: Shared workspaces and resources
- **Approval Workflows**: Multi-level approval processes

### Admin Tools
- **User Management**: Create, edit, suspend, delete users
- **Content Moderation**: Review and moderate user-generated content
- **Fraud Detection**: AI-powered fraud detection and prevention
- **Dispute Resolution**: Mediate conflicts between users
- **System Configuration**: Platform-wide settings and features

---

## 16. Admin Panel

### Admin Dashboard (/admin/dashboard)
- **System Overview**: Key platform metrics
- **User Statistics**: Registration and activity data
- **Revenue Tracking**: Platform income analysis
- **Performance Monitoring**: System health indicators
- **Alert System**: Critical issues and notifications

### User Management (/admin/users)
- **User Search**: Find users by email, name, or ID
- **User Details**: Complete user profile and activity
- **Account Actions**: Suspend, activate, delete accounts
- **Role Management**: Assign and change user roles
- **Bulk Operations**: Mass user actions

### Content Moderation
- **Campaign Review**: Approve/reject submitted campaigns
- **Content Screening**: Review uploaded media and content
- **Flagged Content**: Handle user-reported content
- **Automated Moderation**: AI-powered content filtering
- **Moderation Queue**: Prioritized review system

### Platform Settings (/admin/settings)
- **Feature Flags**: Enable/disable platform features
- **Fee Configuration**: Set platform commission rates
- **Email Templates**: Customize notification emails
- **Security Settings**: Configure security policies
- **Integration Settings**: Manage third-party integrations

### Financial Management
- **Revenue Dashboard**: Platform income and expenses
- **Transaction Monitoring**: Track all financial transactions
- **Payout Processing**: Manage creator withdrawals
- **Tax Reporting**: Generate tax documents
- **Dispute Handling**: Financial dispute resolution

---

## 17. Troubleshooting

| Issue | Likely Cause | Resolution |
|-------|--------------|------------|
| **Login Failed** | Incorrect password or account locked | Use password reset, wait for lockout to expire |
| **Email Not Verified** | Verification email not received | Check spam folder, request new verification email |
| **Payment Failed** | Insufficient funds or card declined | Update payment method, check bank account |
| **File Upload Error** | File too large or unsupported format | Check file size limits, use supported formats |
| **Messages Not Sending** | Network connectivity issue | Check internet connection, refresh page |
| **Dashboard Not Loading** | Browser cache or JavaScript error | Clear cache, try different browser |
| **Deal Not Appearing** | Filter settings or search criteria | Reset filters, check deal status |
| **Notifications Not Working** | Browser permissions disabled | Enable notifications in browser settings |
| **Performance Slow** | Large file uploads or high traffic | Wait for completion, try off-peak hours |
| **Account Suspended** | Policy violation or suspicious activity | Contact support, review terms of service |

---

## 18. Quick Reference — Roles & Permissions

### Permission Matrix

| Feature | Creator | Brand | Admin | Super Admin |
|---------|---------|-------|-------|-------------|
| **Profile Management** | ✓ | ✓ | ✓ | ✓ |
| **Create Campaigns** | ✗ | ✓ | ✓ | ✓ |
| **Apply for Deals** | ✓ | ✗ | ✓ | ✓ |
| **Manage Deals** | ✓ (own) | ✓ (own) | ✓ | ✓ |
| **Process Payments** | ✓ (withdrawals) | ✓ (payments) | ✓ | ✓ |
| **View Analytics** | ✓ (own) | ✓ (own) | ✓ | ✓ |
| **Send Messages** | ✓ | ✓ | ✓ | ✓ |
| **Upload Files** | ✓ | ✓ | ✓ | ✓ |
| **Manage Team** | ✗ | ✓ | ✓ | ✓ |
| **Moderate Content** | ✗ | ✗ | ✓ | ✓ |
| **Manage Users** | ✗ | ✗ | ✓ | ✓ |
| **Platform Settings** | ✗ | ✗ | ✓ | ✓ |
| **View Reports** | ✗ | ✗ | ✓ | ✓ |
| **Handle Disputes** | ✓ (participate) | ✓ (participate) | ✓ | ✓ |
| **Fraud Review** | ✗ | ✗ | ✓ | ✓ |
| **System Admin** | ✗ | ✗ | ✗ | ✓ |

### Legend
- ✓ = Full access
- ✗ = No access
- (own) = Only for own content/accounts
- (participate) = Can participate but not resolve

---

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Token refresh
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/2fa/enable` - Enable 2FA
- `POST /api/auth/2fa/disable` - Disable 2FA
- `POST /api/auth/2fa/verify` - 2FA verification

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/upload` - Upload profile picture
- `GET /api/users/stats` - Get user statistics

### Campaigns
- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/publish` - Publish campaign
- `POST /api/campaigns/:id/pause` - Pause campaign
- `POST /api/campaigns/:id/complete` - Complete campaign

### Deals
- `GET /api/deals` - List deals
- `POST /api/deals` - Create deal
- `GET /api/deals/:id` - Get deal details
- `PUT /api/deals/:id` - Update deal
- `POST /api/deals/:id/accept` - Accept deal
- `POST /api/deals/:id/decline` - Decline deal
- `POST /api/deals/:id/negotiate` - Submit counter-offer

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Process payment
- `GET /api/payments/:id` - Get payment details
- `POST /api/payments/withdraw` - Request withdrawal
- `POST /api/payments/webhook` - Stripe webhook

### Messages
- `GET /api/messages` - List conversations
- `POST /api/messages` - Send message
- `GET /api/messages/:id` - Get conversation
- `PUT /api/messages/:id/read` - Mark as read

### Notifications
- `GET /api/notifications` - List notifications
- `PUT /api/notifications/read` - Mark all as read
- `DELETE /api/notifications` - Clear notifications

### Upload
- `POST /api/upload` - Upload file
- `GET /api/upload/:id` - Get file info
- `DELETE /api/upload/:id` - Delete file

### Search
- `GET /api/search/creators` - Search creators
- `GET /api/search/campaigns` - Search campaigns
- `GET /api/search/deals` - Search deals

### Admin
- `GET /api/admin/dashboard` - Admin dashboard
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/reports` - Get reports
- `POST /api/admin/settings` - Update settings

---

*This manual is based on the live InfluenceX codebase and reflects all currently implemented features. Features marked as [COMING SOON] or [IN PROGRESS] are planned but not yet available.*
