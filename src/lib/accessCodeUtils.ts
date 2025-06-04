import Booking, { IBooking } from '../models/Booking';

/**
 * Generates a single random digit between 1 and 9 (inclusive).
 * @returns {string} A string representation of the random digit.
 */
function generateSingleDigit(): string {
  return Math.floor(Math.random() * 9 + 1).toString(); // Generates digits 1-9
}

/**
 * Generates a 6-digit access code.
 * Each digit is a random number between 1 and 9.
 * The code generated will not start with the sequence "12".
 * If a code starting with "12" is generated, it will be regenerated until a valid one is obtained.
 * @returns {string} The valid 6-digit access code.
 */
export function generateAccessCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 6 }, generateSingleDigit).join('');
  } while (code.startsWith('12'));
  return code;
}

/**
 * Finds an active booking by its access code.
 * An active booking is one where the access code matches and the check-out date
 * is greater than or equal to the current date and time.
 *
 * @param {string} accessCodeToFind - The access code to search for.
 * @returns {Promise<IBooking | null>} A promise that resolves to the booking document if found, otherwise null.
 */
export async function findActiveBookingByAccessCode(accessCodeToFind: string): Promise<IBooking | null> {
  // new Date() creates a date with the current date and time.
  // This ensures that bookings are considered active up until the moment of check-out.
  return await Booking.findOne({
    accessCode: accessCodeToFind,
    checkOut: { $gte: new Date() } // Check-out date is greater than or equal to the current moment
  }).lean<IBooking | null>(); // Using .lean() for performance as we only need the plain object.
}
