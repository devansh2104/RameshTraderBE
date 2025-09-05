const express = require('express');
const router = express.Router();
const cookieService = require('../services/cookieService');
const { ensureVisitor, checkConsent, requireConsent } = require('../middleware/cookieMiddleware');

// Diagnostics: DB and visitor health (place BEFORE ensureVisitor so it always works)
router.get('/debug/health', async (req, res) => {
  try {
    const health = await cookieService.checkDbHealth();
    res.json({
      db: health,
      visitorIdCookie: (req.cookies && req.cookies.visitorId) || null,
      ip: (req.headers['x-forwarded-for'] || req.ip || (req.socket && req.socket.remoteAddress) || 'unknown')
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e && e.message });
  }
});

// Apply visitor middleware to all cookie routes
router.use(ensureVisitor);

// (moved above)

// Save consent preferences
router.post('/consent', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const { acceptAll, acceptNecessary, rejectAll } = req.body;
    
    // Get previous consent for logging
    const previousConsent = await cookieService.getVisitorConsent(req.visitorDbId);
    
    // Save new consent
    const consent = await cookieService.saveConsent(req.visitorDbId, {
      acceptAll, acceptNecessary, rejectAll
    });

    // Log the consent action
    const action = acceptAll ? 'accept_all' : 
                   rejectAll ? 'reject_all' : 
                   acceptNecessary ? 'accept_necessary' : 'update_preferences';
    
    await cookieService.logConsentAction(
      req.visitorDbId, 
      action, 
      previousConsent, 
      consent, 
      req
    );

    res.json({ 
      message: "Consent stored successfully", 
      consent,
      visitorId: req.visitorId 
    });
  } catch (error) {
    console.error("/consent error", {
      message: error?.message,
      code: error?.code,
      errno: error?.errno,
      sqlState: error?.sqlState,
      stack: error?.stack
    });
    res.status(500).json({ message: "Failed to store consent", details: error?.message, code: error?.code });
  }
});

// Set cookies based on consent
router.get('/set-cookies', checkConsent, requireConsent, async (req, res) => {
  try {
    if (!req.cookieConsent) {
      return res.status(400).json({ message: "No consent found. Please provide consent first." });
    }

    const consent = req.cookieConsent;

    // Always set strictly necessary cookies
    const nowSession = "session_" + Date.now();
    res.cookie("sessionId", nowSession, { 
      httpOnly: true, 
      sameSite: "Lax", 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    await cookieService.saveCookieRecord(req.visitorDbId, "sessionId", nowSession, req, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    const nowCsrf = "token_" + Math.random().toString(36).substr(2, 9);
    res.cookie("csrfToken", nowCsrf, { 
      httpOnly: true, 
      sameSite: "Lax", 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    await cookieService.saveCookieRecord(req.visitorDbId, "csrfToken", nowCsrf, req, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    const nowCart = "cart_" + Math.random().toString(36).substr(2, 9);
    res.cookie("cartId", nowCart, { 
      httpOnly: true, 
      sameSite: "Lax", 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    await cookieService.saveCookieRecord(req.visitorDbId, "cartId", nowCart, req, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    });

    // Set functional cookies if consented
    if (consent.functional) {
      res.cookie("lang", "en", { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "lang", "en", req);

      res.cookie("theme", "light", { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "theme", "light", req);

      res.cookie("rememberMe", "false", { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "rememberMe", "false", req);
    }

    // Set performance cookies if consented
    if (consent.performance) {
      const ga = "GA1.2." + Math.random().toString().substr(2, 9);
      res.cookie("_ga", ga, { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 2 * 365 * 24 * 60 * 60 * 1000 // 2 years
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "_ga", ga, req);

      const gid = "GA1.2." + Math.random().toString().substr(2, 9);
      res.cookie("_gid", gid, { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "_gid", gid, req);
    }

    // Set marketing cookies if consented
    if (consent.marketing) {
      const fbp = "fb.1." + Date.now() + "." + Math.random().toString().substr(2, 9);
      res.cookie("_fbp", fbp, { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3 * 30 * 24 * 60 * 60 * 1000 // 3 months
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "_fbp", fbp, req);

      const gcl = "1.1." + Math.random().toString().substr(2, 9);
      res.cookie("_gcl_au", gcl, { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 3 * 30 * 24 * 60 * 60 * 1000 // 3 months
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "_gcl_au", gcl, req);
    }

    // Set social cookies if consented
    if (consent.social) {
      res.cookie("socialLogin", "enabled", { 
        sameSite: "Lax", 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      await cookieService.saveCookieRecord(req.visitorDbId, "socialLogin", "enabled", req);
    }

    // Fetch stored records to include in response
    const stored = await cookieService.getVisitorCookies(req.visitorDbId, 100);

    res.json({ 
      message: "Cookies set based on consent", 
      consent,
      visitorId: req.visitorId,
      stored
    });
  } catch (error) {
    console.error("/set-cookies error", error);
    res.status(500).json({ message: "Failed to set cookies" });
  }
});

// Capture ALL browser cookies and categorize them
router.post('/capture-all-cookies', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const result = await cookieService.captureAllBrowserCookies(req.visitorDbId, req);

    res.json({ 
      message: "All browser cookies captured and categorized successfully", 
      ...result,
      visitorId: req.visitorId 
    });
  } catch (error) {
    console.error("/capture-all-cookies error", error);
    res.status(500).json({ message: "Failed to capture all cookies" });
  }
});

// Capture current cookies from request and store them (legacy endpoint)
router.post('/capture-cookies', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const entries = Object.entries(req.cookies || {});
    for (const [name, value] of entries) {
      if (name !== 'visitorId') { // Don't capture our own visitorId
        await cookieService.saveCookieRecord(req.visitorDbId, name, value, req);
      }
    }

    res.json({ 
      message: "Cookies captured successfully", 
      count: entries.length,
      visitorId: req.visitorId 
    });
  } catch (error) {
    console.error("/capture-cookies error", error);
    res.status(500).json({ message: "Failed to capture cookies" });
  }
});

// Accept client-side cookies list and store them (name/value/ip)
router.post('/ingest-client-cookies', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const { cookies } = req.body || {};
    if (!Array.isArray(cookies)) {
      return res.status(400).json({ message: "'cookies' must be an array of { name, value }" });
    }

    let saved = 0;
    for (const item of cookies) {
      if (!item || typeof item.name !== 'string') continue;
      const name = item.name;
      const value = typeof item.value === 'string' ? item.value : String(item.value ?? '');
      if (name === 'visitorId') continue;
      await cookieService.saveCookieRecord(req.visitorDbId, name, value, req);
      saved++;
    }

    res.json({ message: 'Client cookies ingested', saved, visitorId: req.visitorId });
  } catch (error) {
    console.error('/ingest-client-cookies error', error);
    res.status(500).json({ message: 'Failed to ingest client cookies' });
  }
});

// Get current consent status
router.get('/consent-status', checkConsent, async (req, res) => {
  try {
    res.json({ 
      consent: req.cookieConsent,
      visitorId: req.visitorId,
      hasConsent: !!req.cookieConsent
    });
  } catch (error) {
    console.error("/consent-status error", error);
    res.status(500).json({ message: "Failed to get consent status" });
  }
});

// Get visitor's cookie records (for debugging/admin)
router.get('/debug/cookies', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const current = req.cookies || {};
    const stored = await cookieService.getVisitorCookies(req.visitorDbId, 50);

    res.json({ 
      current, 
      stored,
      visitorId: req.visitorId,
      visitorDbId: req.visitorDbId
    });
  } catch (error) {
    console.error("/debug/cookies error", error);
    res.status(500).json({ message: "Failed to get debug cookies" });
  }
});

// Get cookie statistics (for admin)
router.get('/stats', async (req, res) => {
  try {
    const stats = await cookieService.getCookieStats();
    res.json(stats);
  } catch (error) {
    console.error("/stats error", error);
    res.status(500).json({ message: "Failed to get cookie statistics" });
  }
});

// Get all available cookie categories
router.get('/categories', async (req, res) => {
  try {
    const categories = cookieService.getAllCookieCategories();
    res.json({ categories });
  } catch (error) {
    console.error("/categories error", error);
    res.status(500).json({ message: "Failed to get cookie categories" });
  }
});

// Get cookies by category
router.get('/by-category/:category', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const { category } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const cookies = await cookieService.getCookiesByCategory(req.visitorDbId, category, limit);
    
    res.json({ 
      category,
      cookies,
      count: cookies.length,
      visitorId: req.visitorId 
    });
  } catch (error) {
    console.error("/by-category error", error);
    res.status(500).json({ message: "Failed to get cookies by category" });
  }
});

// Force set all cookies (for testing)
router.post('/set-all-cookies', async (req, res) => {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }

    const cookiePairs = [
      ["sessionId", "session_" + Date.now()],
      ["csrfToken", "token_" + Math.random().toString(36).substr(2, 9)],
      ["cartId", "cart_" + Math.random().toString(36).substr(2, 9)],
      ["lang", "en"],
      ["theme", "light"],
      ["rememberMe", "false"],
      ["_ga", "GA1.2." + Math.random().toString().substr(2, 9)],
      ["_gid", "GA1.2." + Math.random().toString().substr(2, 9)],
      ["_fbp", "fb.1." + Date.now() + "." + Math.random().toString().substr(2, 9)],
      ["_gcl_au", "1.1." + Math.random().toString().substr(2, 9)],
      ["socialLogin", "enabled"]
    ];

    for (const [name, value] of cookiePairs) {
      const cookieOptions = name === "sessionId" || name === "csrfToken" || name === "cartId"
        ? { 
            httpOnly: true, 
            sameSite: "Lax", 
            secure: process.env.NODE_ENV === 'production',
            maxAge: name === "cartId" ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
          }
        : { 
            sameSite: "Lax", 
            secure: process.env.NODE_ENV === 'production',
            maxAge: 365 * 24 * 60 * 60 * 1000
          };
      
      res.cookie(name, value, cookieOptions);
      await cookieService.saveCookieRecord(req.visitorDbId, name, value, req, {
        httpOnly: name === "sessionId" || name === "csrfToken" || name === "cartId",
        secure: process.env.NODE_ENV === 'production'
      });
    }

    res.json({ 
      message: "All cookies set successfully", 
      count: cookiePairs.length,
      visitorId: req.visitorId 
    });
  } catch (error) {
    console.error("/set-all-cookies error", error);
    res.status(500).json({ message: "Failed to set all cookies" });
  }
});

module.exports = router;
