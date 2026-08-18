export function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\s+/g, '').replace(/[()\-]/g, '');
}

export function isValidPhoneNumber(phone: string | null | undefined): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized) return false;
  if (!/^\+?\d{10,15}$/.test(normalized)) return false;
  return normalized.replace(/^\+/, '').length >= 10;
}

export function getPhoneValidationError(phone: string | null | undefined): string | null {
  if (!phone || !isValidPhoneNumber(phone)) {
    return 'Please add your phone number before requesting a service.';
  }
  return null;
}

export function getBookingAddressValidationError(
  addresses: Array<{ id?: string | null }> | null | undefined,
  selectedAddress: { id?: string | null } | null | undefined,
): string | null {
  const hasAddresses = !!addresses && addresses.length > 0;
  if (!hasAddresses) return null;
  if (!selectedAddress || !selectedAddress.id) {
    return 'Please select or add your address before requesting a service.';
  }
  return null;
}
