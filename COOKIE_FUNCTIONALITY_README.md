# Cookie Management System

This document describes the comprehensive cookie management system implemented for Ramesh Traders, which includes cookie consent tracking, IP address logging, and database storage.

## Overview

The cookie system provides:
- **Visitor Identification**: Unique visitor tracking with IP address logging
- **Consent Management**: GDPR-compliant cookie consent tracking
- **Cookie Categories**: Organized cookie management (Strictly Necessary, Functional, Performance, Marketing, Social)
- **Audit Trail**: Complete logging of consent actions and cookie usage
- **IP Address Tracking**: Every cookie is linked to the visitor's IP address

## Database Tables

### 1. `cookie_visitors`
Stores visitor information and IP addresses.

```sql
CREATE TABLE cookie_visitors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 2. `cookie_consents`
Stores user consent preferences.

```sql
CREATE TABLE cookie_consents (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    strictly_necessary BOOLEAN DEFAULT TRUE,
    functional BOOLEAN DEFAULT FALSE,
    performance BOOLEAN DEFAULT FALSE,
    marketing BOOLEAN DEFAULT FALSE,
    social BOOLEAN DEFAULT FALSE,
    rejected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES cookie_visitors(id)
);
```

### 3. `cookie_records`
Stores individual cookie records with IP addresses.

```sql
CREATE TABLE cookie_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    cookie_name VARCHAR(255) NOT NULL,
    cookie_value TEXT,
    category ENUM('Strictly Necessary', 'Functional', 'Performance', 'Marketing', 'Social', 'Uncategorized'),
    http_only BOOLEAN DEFAULT FALSE,
    secure BOOLEAN DEFAULT FALSE,
    same_site VARCHAR(20) DEFAULT 'Lax',
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES cookie_visitors(id)
);
```

### 4. `cookie_consent_logs`
Audit trail for consent actions.

```sql
CREATE TABLE cookie_consent_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    visitor_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    action ENUM('accept_all', 'accept_necessary', 'reject_all', 'update_preferences'),
    previous_consent JSON,
    new_consent JSON,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (visitor_id) REFERENCES cookie_visitors(id)
);
```

## Backend Implementation

### Files Created/Modified:

1. **`cookies_tables.sql`** - Database schema
2. **`services/cookieService.js`** - Core cookie management logic
3. **`middleware/cookieMiddleware.js`** - Express middleware for visitor tracking
4. **`routes/cookies.js`** - API endpoints for cookie management
5. **`server.js`** - Updated to include cookie functionality

### Key Features:

#### Cookie Service (`services/cookieService.js`)
- Visitor identification and tracking
- Consent management
- Cookie record storage with IP addresses
- Audit trail logging
- Statistics generation

#### Cookie Categories:
- **Strictly Necessary**: sessionId, csrfToken, cartId, visitorId
- **Functional**: lang, theme, rememberMe, userPreferences
- **Performance**: _ga, _gid, _gat, analyticsId
- **Marketing**: _fbp, _gcl_au, advertisingId, trackingId
- **Social**: twitterLogin, linkedinShare, instagramAuth, socialLogin

#### API Endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/cookies/consent` | POST | Save user consent preferences |
| `/api/cookies/set-cookies` | GET | Set cookies based on consent |
| `/api/cookies/capture-cookies` | POST | Capture existing cookies |
| `/api/cookies/consent-status` | GET | Get current consent status |
| `/api/cookies/debug/cookies` | GET | Debug cookie information |
| `/api/cookies/stats` | GET | Get cookie statistics |
| `/api/cookies/set-all-cookies` | POST | Force set all cookies (testing) |

## Frontend Implementation

### Files Created:

1. **`shared/components/cookie-consent/cookie-consent.component.ts`** - Angular component
2. **`shared/components/cookie-consent/cookie-consent.component.html`** - Template
3. **`shared/components/cookie-consent/cookie-consent.component.css`** - Styles
4. **`app.component.ts`** - Updated to include cookie consent
5. **`app.component.html`** - Updated to include cookie banner

### Features:

- **Modern UI**: Responsive design with gradient background
- **Consent Options**: Accept All, Accept Necessary Only, Reject All
- **Loading States**: Visual feedback during API calls
- **Auto-hide**: Banner disappears after consent is given
- **Debug Mode**: Development tools for testing

## Installation & Setup

### 1. Database Setup
```bash
# Run the SQL file to create tables
mysql -u your_username -p your_database < cookies_tables.sql
```

### 2. Backend Dependencies
```bash
cd rameshtradersBE
npm install cookie-parser
```

### 3. Environment Configuration
Ensure your environment files have the correct API URL:

**Development (`environment.ts`):**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:4001'
};
```

**Production (`environment.prod.ts`):**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://rameshtrader.com'
};
```

## Usage

### 1. Cookie Consent Flow
1. User visits the website
2. Cookie consent banner appears (if no consent given)
3. User chooses consent option
4. Consent is saved to database with IP address
5. Cookies are set based on consent
6. Banner disappears

### 2. Cookie Tracking
- Every cookie set is logged with visitor ID and IP address
- Cookie categories are automatically determined
- Audit trail tracks all consent changes

### 3. Debug & Testing
```bash
# Check cookie statistics
GET /api/cookies/stats

# Debug current cookies
GET /api/cookies/debug/cookies

# Force set all cookies (testing)
POST /api/cookies/set-all-cookies
```

## Security Features

1. **IP Address Logging**: Every cookie is linked to the visitor's IP
2. **Secure Cookies**: HttpOnly and Secure flags for sensitive cookies
3. **SameSite Protection**: CSRF protection with SameSite=Lax
4. **Audit Trail**: Complete logging of all consent actions
5. **Visitor Isolation**: Each visitor has unique tracking

## GDPR Compliance

- **Explicit Consent**: Users must actively choose consent options
- **Granular Control**: Different categories of cookies
- **Right to Withdraw**: Users can change preferences
- **Data Minimization**: Only necessary data is collected
- **Transparency**: Clear information about cookie usage
- **Audit Trail**: Complete record of consent actions

## Monitoring & Analytics

### Cookie Statistics
```bash
GET /api/cookies/stats
```
Returns:
- Total visitors
- Total consents
- Total cookie records

### Debug Information
```bash
GET /api/cookies/debug/cookies
```
Returns:
- Current browser cookies
- Stored cookie records
- Visitor information

## Troubleshooting

### Common Issues:

1. **Cookie not setting**: Check CORS configuration and credentials
2. **IP address not captured**: Verify proxy settings and IP extraction logic
3. **Consent not saving**: Check database connection and table structure
4. **Banner not showing**: Verify component is imported and included in app

### Debug Steps:

1. Check browser console for errors
2. Verify API endpoints are accessible
3. Check database connection and table structure
4. Verify environment configuration
5. Test with debug endpoints

## Future Enhancements

1. **Cookie Preferences Page**: Allow users to change preferences
2. **Analytics Dashboard**: Visual representation of cookie usage
3. **Export Functionality**: GDPR data export
4. **Advanced Categories**: More granular cookie categorization
5. **A/B Testing**: Test different consent UI designs

## Support

For issues or questions regarding the cookie management system, please refer to:
- Database schema: `cookies_tables.sql`
- Backend service: `services/cookieService.js`
- API routes: `routes/cookies.js`
- Frontend component: `shared/components/cookie-consent/`
