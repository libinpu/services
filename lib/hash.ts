// SHA-256 Hashing helper for securing OTPs

export async function hashOtp(otp: string): Promise<string> {
  try {
    // If running in browser or environment with crypto.subtle
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const msgUint8 = new TextEncoder().encode(otp);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('Subtle crypto error, falling back to simple hash:', e);
  }

  // Fallback lightweight hash function for compatibility
  let hash = 0;
  for (let i = 0; i < otp.length; i++) {
    const char = otp.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return 'fallback_' + Math.abs(hash).toString(16);
}

export async function verifyOtp(enteredOtp: string, storedHash: string): Promise<boolean> {
  if (!storedHash) return false;
  
  // If legacy plaintext OTP (4 digits)
  if (storedHash.length === 4 && /^\d+$/.test(storedHash)) {
    return enteredOtp === storedHash;
  }
  
  const hashed = await hashOtp(enteredOtp);
  return hashed === storedHash;
}
