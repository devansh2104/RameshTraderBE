const db = require('../db');
const crypto = require('crypto');

// Enhanced categories mapping for different types of cookies
const categories = {
  strictlyNecessary: [
    "sessionId", "csrfToken", "cartId", "visitorId", "PHPSESSID", "JSESSIONID", 
    "ASP.NET_SessionId", "session", "sid", "token", "auth", "login", "user_id"
  ],
  functional: [
    "lang", "theme", "rememberMe", "userPreferences", "language", "locale", 
    "timezone", "currency", "country", "region", "preferences", "settings",
    "ui_theme", "display_mode", "font_size", "accessibility"
  ],
  performance: [
    "_ga", "_gid", "_gat", "analyticsId", "_ga_", "_gac_", "_gtag", "gtm",
    "analytics", "stats", "metrics", "performance", "speed", "load_time",
    "page_views", "session_duration", "bounce_rate"
  ],
  marketing: [
    "_fbp", "_gcl_au", "advertisingId", "trackingId", "fbp", "fbc", "fb_",
    "google_ads", "bing_ads", "twitter_ads", "linkedin_ads", "pinterest_ads",
    "adwords", "remarketing", "retargeting", "conversion", "campaign",
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"
  ],
  social: [
    "twitterLogin", "linkedinShare", "instagramAuth", "socialLogin", "twitter_",
    "facebook_", "linkedin_", "instagram_", "pinterest_", "youtube_", "tiktok_",
    "social_", "share_", "like_", "follow_", "comment_"
  ],
  security: [
    "csrf", "xsrf", "security", "auth_token", "jwt", "bearer", "api_key",
    "captcha", "recaptcha", "hcaptcha", "2fa", "mfa", "otp", "verification"
  ],
  ecommerce: [
    "cart", "basket", "order", "checkout", "payment", "shipping", "billing",
    "product", "item", "category", "wishlist", "favorites", "recent",
    "recommendations", "reviews", "ratings"
  ],
  personalization: [
    "personalization", "customization", "profile", "user_data", "behavior",
    "interests", "preferences", "history", "saved", "bookmarks", "favorites"
  ],
  thirdParty: [
    "google", "facebook", "twitter", "linkedin", "instagram", "youtube",
    "tiktok", "pinterest", "snapchat", "whatsapp", "telegram", "discord",
    "slack", "zoom", "teams", "skype", "viber", "line", "wechat"
  ],
  advertising: [
    "ads", "advertising", "banner", "popup", "sponsored", "promotion",
    "offer", "discount", "coupon", "deal", "sale", "marketing"
  ],
  analytics: [
    "analytics", "tracking", "monitoring", "logging", "debug", "error",
    "performance", "metrics", "stats", "data", "insights", "reporting"
  ]
};

function getCategory(name) {
  const lowerName = name.toLowerCase();
  
  // Check each category
  for (const [category, patterns] of Object.entries(categories)) {
    for (const pattern of patterns) {
      if (lowerName.includes(pattern.toLowerCase()) || lowerName === pattern.toLowerCase()) {
        return category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1');
      }
    }
  }
  
  // Additional pattern matching for common cookie patterns
  if (lowerName.includes('session') || lowerName.includes('auth') || lowerName.includes('login')) {
    return "Strictly Necessary";
  }
  if (lowerName.includes('lang') || lowerName.includes('locale') || lowerName.includes('theme')) {
    return "Functional";
  }
  if (lowerName.includes('_ga') || lowerName.includes('analytics') || lowerName.includes('tracking')) {
    return "Performance";
  }
  if (lowerName.includes('_fbp') || lowerName.includes('ads') || lowerName.includes('marketing')) {
    return "Marketing";
  }
  if (lowerName.includes('social') || lowerName.includes('share') || lowerName.includes('like')) {
    return "Social";
  }
  if (lowerName.includes('security') || lowerName.includes('csrf') || lowerName.includes('jwt')) {
    return "Security";
  }
  if (lowerName.includes('cart') || lowerName.includes('order') || lowerName.includes('checkout')) {
    return "E-commerce";
  }
  if (lowerName.includes('personal') || lowerName.includes('custom') || lowerName.includes('profile')) {
    return "Personalization";
  }
  if (lowerName.includes('google') || lowerName.includes('facebook') || lowerName.includes('twitter')) {
    return "Third Party";
  }
  
  return "Uncategorized";
}

function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

class CookieService {
  // Ensure visitor exists and return visitor ID
  async ensureVisitor(req) {
    try {
      if (!req.cookies.visitorId) {
        const visitorId = crypto.randomUUID();
        req.visitorId = visitorId;
        
        // Insert into cookie_visitors table
        const ip = getClientIp(req);
        const userAgent = req.headers['user-agent'] || '';
        
        const [result] = await db.promise().execute(
          "INSERT INTO cookie_visitors (visitor_id, ip_address, user_agent) VALUES (?, ?, ?)",
          [visitorId, ip, userAgent]
        );
        req.visitorDbId = result.insertId;
        
        return { visitorId, isNew: true };
      } else {
        req.visitorId = req.cookies.visitorId;
        
        // Get visitor from database
        const [rows] = await db.promise().execute(
          "SELECT id FROM cookie_visitors WHERE visitor_id = ?",
          [req.visitorId]
        );
        
        if (rows.length > 0) {
          req.visitorDbId = rows[0].id;
          return { visitorId: req.visitorId, isNew: false };
        } else {
          // Cookie exists but visitor row missing: recreate visitor
          const ip = getClientIp(req);
          const userAgent = req.headers['user-agent'] || '';
          
          const [result] = await db.promise().execute(
            "INSERT INTO cookie_visitors (visitor_id, ip_address, user_agent) VALUES (?, ?, ?)",
            [req.visitorId, ip, userAgent]
          );
          req.visitorDbId = result.insertId;
          
          return { visitorId: req.visitorId, isNew: false };
        }
      }
    } catch (error) {
      console.error("ensureVisitor error", {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        sqlState: error?.sqlState,
        stack: error?.stack
      });
      throw new Error("Failed to identify visitor");
    }
  }

  // Save cookie consent
  async saveConsent(visitorDbId, consentData) {
    try {
      const { acceptAll, acceptNecessary, rejectAll } = consentData;
      
      let consent = {
        strictly_necessary: true,
        functional: false,
        performance: false,
        marketing: false,
        social: false,
        rejected: false
      };

      if (acceptAll) {
        consent.functional = true;
        consent.performance = true;
        consent.marketing = true;
        consent.social = true;
      } else if (rejectAll) {
        consent.rejected = true;
      } else if (acceptNecessary) {
        // Only strictly necessary cookies
        consent.functional = false;
        consent.performance = false;
        consent.marketing = false;
        consent.social = false;
        consent.rejected = false;
      }

      // Save consent to database
      await db.promise().execute(
        `INSERT INTO cookie_consents 
        (visitor_id, strictly_necessary, functional, performance, marketing, social, rejected)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          visitorDbId,
          consent.strictly_necessary,
          consent.functional,
          consent.performance,
          consent.marketing,
          consent.social,
          consent.rejected
        ]
      );

      return consent;
    } catch (error) {
      console.error("saveConsent error", error);
      throw new Error("Failed to save consent");
    }
  }

  // Save individual cookie record
  async saveCookieRecord(visitorDbId, name, value, req, options = {}) {
    try {
      const category = getCategory(name);
      const ip = getClientIp(req);
      const {
        httpOnly = false,
        secure = false,
        sameSite = 'Lax',
        expiresAt = null
      } = options;

      await db.promise().execute(
        `INSERT INTO cookie_records 
        (visitor_id, ip_address, cookie_name, cookie_value, category, http_only, secure, same_site, expires_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [visitorDbId, ip, name, value, category, httpOnly, secure, sameSite, expiresAt]
      );
    } catch (error) {
      console.error("saveCookieRecord error", error);
      throw new Error("Failed to save cookie record");
    }
  }

  // Get visitor's consent
  async getVisitorConsent(visitorDbId) {
    try {
      const [rows] = await db.promise().execute(
        "SELECT * FROM cookie_consents WHERE visitor_id = ? ORDER BY created_at DESC LIMIT 1",
        [visitorDbId]
      );
      
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error("getVisitorConsent error", error);
      throw new Error("Failed to get visitor consent");
    }
  }

  // Get visitor's cookie records
  async getVisitorCookies(visitorDbId, limit = 50) {
    try {
      const [rows] = await db.promise().execute(
        "SELECT * FROM cookie_records WHERE visitor_id = ? ORDER BY created_at DESC LIMIT ?",
        [visitorDbId, limit]
      );
      
      return rows;
    } catch (error) {
      console.error("getVisitorCookies error", error);
      throw new Error("Failed to get visitor cookies");
    }
  }

  // Log consent action for audit trail
  async logConsentAction(visitorDbId, action, previousConsent, newConsent, req) {
    try {
      const ip = getClientIp(req);
      const userAgent = req.headers['user-agent'] || '';
      
      await db.promise().execute(
        `INSERT INTO cookie_consent_logs 
        (visitor_id, ip_address, action, previous_consent, new_consent, user_agent)
        VALUES (?, ?, ?, ?, ?, ?)`,
        [
          visitorDbId,
          ip,
          action,
          JSON.stringify(previousConsent),
          JSON.stringify(newConsent),
          userAgent
        ]
      );
    } catch (error) {
      console.error("logConsentAction error", error);
      // Don't throw error for logging failures
    }
  }

  // Get cookie statistics
  async getCookieStats() {
    try {
      const [visitorCount] = await db.promise().execute("SELECT COUNT(*) as count FROM cookie_visitors");
      const [consentCount] = await db.promise().execute("SELECT COUNT(*) as count FROM cookie_consents");
      const [recordCount] = await db.promise().execute("SELECT COUNT(*) as count FROM cookie_records");
      
      return {
        totalVisitors: visitorCount[0].count,
        totalConsents: consentCount[0].count,
        totalCookieRecords: recordCount[0].count
      };
    } catch (error) {
      console.error("getCookieStats error", error);
      throw new Error("Failed to get cookie statistics");
    }
  }

  // Simple DB connectivity check for diagnostics
  async checkDbHealth() {
    try {
      const [rows] = await db.promise().query('SELECT 1 AS ok');
      return { ok: true, rows };
    } catch (error) {
      console.error('DB health check failed', {
        message: error?.message,
        code: error?.code,
        errno: error?.errno,
        sqlState: error?.sqlState,
        stack: error?.stack
      });
      return { ok: false, error: { message: error?.message, code: error?.code, errno: error?.errno, sqlState: error?.sqlState } };
    }
  }

  // Capture ALL browser cookies and categorize them
  async captureAllBrowserCookies(visitorDbId, req) {
    try {
      const allCookies = req.cookies || {};
      const capturedCookies = [];
      
      for (const [name, value] of Object.entries(allCookies)) {
        if (name !== 'visitorId') { // Don't capture our own visitorId
          const category = getCategory(name);
          
          // Save to database
          await this.saveCookieRecord(visitorDbId, name, value, req, {
            category: category
          });
          
          capturedCookies.push({
            name,
            value: typeof value === 'string' ? value.substring(0, 100) + (value.length > 100 ? '...' : '') : value,
            category,
            fullValue: value
          });
        }
      }
      
      return {
        totalCaptured: capturedCookies.length,
        cookies: capturedCookies,
        categories: this.getCategoryBreakdown(capturedCookies)
      };
    } catch (error) {
      console.error("captureAllBrowserCookies error", error);
      throw new Error("Failed to capture browser cookies");
    }
  }

  // Get category breakdown of cookies
  getCategoryBreakdown(cookies) {
    const breakdown = {};
    
    cookies.forEach(cookie => {
      const category = cookie.category;
      if (!breakdown[category]) {
        breakdown[category] = 0;
      }
      breakdown[category]++;
    });
    
    return breakdown;
  }

  // Get all cookie categories available
  getAllCookieCategories() {
    return Object.keys(categories).map(category => 
      category.charAt(0).toUpperCase() + category.slice(1).replace(/([A-Z])/g, ' $1')
    );
  }

  // Get cookies by category
  async getCookiesByCategory(visitorDbId, category, limit = 50) {
    try {
      const [rows] = await db.promise().execute(
        "SELECT * FROM cookie_records WHERE visitor_id = ? AND category = ? ORDER BY created_at DESC LIMIT ?",
        [visitorDbId, category, limit]
      );
      
      return rows;
    } catch (error) {
      console.error("getCookiesByCategory error", error);
      throw new Error("Failed to get cookies by category");
    }
  }
}

module.exports = new CookieService();
