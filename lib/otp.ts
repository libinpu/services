export const OTP_LENGTH = 4;

import * as Crypto from 'expo-crypto';

export function generateOtp(): string {
  const bytes = Crypto.getRandomBytes(4);
  const number = (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3];
  const otpVal = 1000 + (Math.abs(number) % 9000);
  return otpVal.toString();
}

export function isValidOtp(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}
