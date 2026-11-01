export function isValidIndianMobileNumber(phoneNumber: string) {
  return /^[6-9]\d{9}$/.test(phoneNumber);
}
