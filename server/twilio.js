const twilio = require('twilio');
const crypto = require('crypto');

class TwilioAuthManager {
  constructor(accountSid, authToken) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.client = twilio(accountSid, authToken);
    this.tokenCache = new Map();
  }

  generateToken() {
    const timestamp = Date.now().toString();
    const signature = crypto
      .createHmac('sha256', this.authToken)
      .update(`${this.accountSid}${timestamp}`)
      .digest('hex');
      
    return {
      token: signature,
      expires: Date.now() + 3600000 // 1 hour expiry
    };
  }

  async validateToken(token) {
    const cachedToken = this.tokenCache.get(token);
    if (cachedToken && cachedToken.expires > Date.now()) {
      return true;
    }
    return false;
  }

  async refreshToken() {
    try {
      const newToken = this.generateToken();
      this.tokenCache.set(newToken.token, {
        expires: newToken.expires
      });
      return newToken.token;
    } catch (error) {
      throw new Error('Token refresh failed: ' + error.message);
    }
  }

  async verifyAccount() {
    try {
      const account = await this.client.api.accounts(this.accountSid).fetch();
      return account.status === 'active';
    } catch (error) {
      throw new Error('Account verification failed: ' + error.message);
    }
  }
}

module.exports = TwilioAuthManager;