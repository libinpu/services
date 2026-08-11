export const OTP_LENGTH = 4;

export function generateOtp(): string {
  const minimum = 10 ** (OTP_LENGTH - 1);
  const maximum = 10 ** OTP_LENGTH;
  return Math.floor(minimum + Math.random() * (maximum - minimum)).toString();
}

export function isValidOtp(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}$/.test(value);
}