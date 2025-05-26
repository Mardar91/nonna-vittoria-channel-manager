// src/utils/stringUtils.ts

/**
 * Extracts the first URL (starting with http:// or https://) from a string.
 * @param text The string to search for a URL.
 * @returns The first URL found, or null if no URL is found or the input is invalid.
 */
export const extractReservationUrl = (text: string | undefined | null): string | null => {
  if (!text) {
    return null;
  }
  const urlRegex = /(https?:\/\/[^\s]+)/;
  const match = text.match(urlRegex);
  return match ? match[0] : null;
};
