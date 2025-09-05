const cookieService = require('../services/cookieService');

// Middleware to ensure visitor is identified and cookie management is set up
async function ensureVisitor(req, res, next) {
  try {
    // Ensure visitor exists and get visitor info
    const visitorInfo = await cookieService.ensureVisitor(req);
    
    // Set visitorId cookie if it's a new visitor
    if (visitorInfo.isNew) {
      res.cookie("visitorId", visitorInfo.visitorId, {
        httpOnly: false, // Changed to false for testing
        sameSite: "Lax",
        secure: false, // Changed to false for local testing
        maxAge: 365 * 24 * 60 * 60 * 1000 // 1 year
      });
    }
    
    next();
  } catch (error) {
    console.error("ensureVisitor middleware error", error);
    res.status(500).json({ message: "Failed to identify visitor" });
  }
}

// Middleware to check if user has given consent
async function checkConsent(req, res, next) {
  try {
    if (!req.visitorDbId) {
      return res.status(400).json({ message: "Visitor not initialized" });
    }
    
    const consent = await cookieService.getVisitorConsent(req.visitorDbId);
    req.cookieConsent = consent;
    
    next();
  } catch (error) {
    console.error("checkConsent middleware error", error);
    res.status(500).json({ message: "Failed to check consent" });
  }
}

// Middleware to require consent before proceeding
function requireConsent(req, res, next) {
  if (!req.cookieConsent) {
    return res.status(403).json({ 
      message: "Cookie consent required",
      requiresConsent: true 
    });
  }
  
  next();
}

module.exports = {
  ensureVisitor,
  checkConsent,
  requireConsent
};
