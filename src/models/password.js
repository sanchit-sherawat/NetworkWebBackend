const crypto = require('crypto');

class PasswordLink {
  constructor({ id, user_id, url, created_at, expires_at }) {
    this.id = id;
    this.user_id = user_id;
    this.url = url;
    this.created_at = created_at || new Date();
    this.expires_at = expires_at;
  }

  // Encrypt a URL/token
  static encryptUrl(url, secret) {
    // secret must be 32 bytes for aes-256-cbc
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    let encrypted = cipher.update(url, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // Store IV with encrypted data (hex)
    return iv.toString('hex') + ':' + encrypted;
  }

  // Decrypt a URL/token
  static decryptUrl(encryptedUrl, secret) {
    const [ivHex, encrypted] = encryptedUrl.split(':');
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  isExpired() {
    return new Date() > new Date(this.expires_at);
  }
}

module.exports = PasswordLink;