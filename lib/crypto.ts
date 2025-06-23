import CryptoJS from 'crypto-js';

export class MessageCrypto {
  private static generateKey(walletAddress: string, channelId: string): string {
    return CryptoJS.SHA256(walletAddress + channelId).toString();
  }

  static encrypt(message: string, walletAddress: string, channelId: string): string {
    const key = this.generateKey(walletAddress, channelId);
    const encrypted = CryptoJS.AES.encrypt(message, key).toString();
    return encrypted;
  }

  static decrypt(encryptedMessage: string, walletAddress: string, channelId: string): string {
    try {
      const key = this.generateKey(walletAddress, channelId);
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, key);
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt message');
    }
  }

  static hashMessage(message: string): string {
    return CryptoJS.SHA256(message).toString();
  }
}