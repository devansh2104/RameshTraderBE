const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret';
const ACCESS_TOKEN_EXPIRES_IN = '15m';

class TokenManager {
  constructor() {
    this.refreshThreshold = 0.9; // 90% of token lifetime
    this.refreshCallbacks = new Set();
  }

  // Decode JWT token without verification (for getting expiration)
  decodeToken(token) {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  }

  // Calculate time until token expires (in milliseconds)
  getTimeUntilExpiry(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return 0;
    
    const expiryTime = decoded.exp * 1000; // Convert to milliseconds
    const currentTime = Date.now();
    return expiryTime - currentTime;
  }

  // Calculate time until refresh should happen (90% of lifetime)
  getTimeUntilRefresh(token) {
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    const tokenLifetime = 15 * 60 * 1000; // 15 minutes in milliseconds
    const refreshTime = tokenLifetime * this.refreshThreshold; // 90% of lifetime
    const timeSinceIssued = tokenLifetime - timeUntilExpiry;
    
    return Math.max(0, refreshTime - timeSinceIssued);
  }

  // Check if token is expired
  isTokenExpired(token) {
    return this.getTimeUntilExpiry(token) <= 0;
  }

  // Check if token should be refreshed (at 90% of lifetime)
  shouldRefreshToken(token) {
    const timeUntilRefresh = this.getTimeUntilRefresh(token);
    return timeUntilRefresh <= 0;
  }

  // Get token expiration time
  getTokenExpirationTime(token) {
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return null;
    return new Date(decoded.exp * 1000);
  }

  // Get refresh time (90% of token lifetime)
  getTokenRefreshTime(token) {
    const expiryTime = this.getTokenExpirationTime(token);
    if (!expiryTime) return null;
    
    const tokenLifetime = 15 * 60 * 1000; // 15 minutes
    const refreshOffset = tokenLifetime * this.refreshThreshold; // 90% of lifetime
    return new Date(expiryTime.getTime() - refreshOffset);
  }

  // Add callback for token refresh events
  onTokenRefresh(callback) {
    this.refreshCallbacks.add(callback);
  }

  // Remove callback
  removeTokenRefreshCallback(callback) {
    this.refreshCallbacks.delete(callback);
  }

  // Notify all refresh callbacks
  notifyRefreshCallbacks(token, newToken) {
    this.refreshCallbacks.forEach(callback => {
      try {
        callback(token, newToken);
      } catch (error) {
        console.error('Error in token refresh callback:', error);
      }
    });
  }

  // Generate new access token
  generateAccessToken(user) {
    return jwt.sign(
      { user_id: user.user_id, email: user.email }, 
      ACCESS_TOKEN_SECRET, 
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
  }

  // Verify token
  verifyToken(token) {
    try {
      return jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (error) {
      return null;
    }
  }

  // Get token info for debugging
  getTokenInfo(token) {
    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    const expiryTime = new Date(decoded.exp * 1000);
    const refreshTime = this.getTokenRefreshTime(token);
    const timeUntilExpiry = this.getTimeUntilExpiry(token);
    const timeUntilRefresh = this.getTimeUntilRefresh(token);

    return {
      issuedAt: new Date(decoded.iat * 1000),
      expiresAt: expiryTime,
      refreshAt: refreshTime,
      timeUntilExpiry: timeUntilExpiry,
      timeUntilRefresh: timeUntilRefresh,
      isExpired: this.isTokenExpired(token),
      shouldRefresh: this.shouldRefreshToken(token),
      user: {
        user_id: decoded.user_id,
        email: decoded.email
      }
    };
  }
}

module.exports = new TokenManager(); 