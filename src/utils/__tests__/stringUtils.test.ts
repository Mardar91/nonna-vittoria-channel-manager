// src/utils/__tests__/stringUtils.test.ts
import { extractReservationUrl } from '../stringUtils';

describe('extractReservationUrl', () => {
  // Test case 1: Input string contains a valid HTTPS URL
  test('should return the HTTPS URL when present', () => {
    const notes = 'Please find the reservation details at https://example.com/booking/123';
    expect(extractReservationUrl(notes)).toBe('https://example.com/booking/123');
  });

  // Test case 2: Input string contains a valid HTTP URL
  test('should return the HTTP URL when present', () => {
    const notes = 'Link: http://example.com/reservation/abc';
    expect(extractReservationUrl(notes)).toBe('http://example.com/reservation/abc');
  });

  // Test case 3: Input string contains multiple URLs
  test('should return the first URL when multiple are present', () => {
    const notes = 'Main link: https://main-example.com. Secondary: http://secondary-example.com';
    expect(extractReservationUrl(notes)).toBe('https://main-example.com');
  });

  // Test case 4: Input string does not contain any URL
  test('should return null when no URL is present', () => {
    const notes = 'This is a note without any URL.';
    expect(extractReservationUrl(notes)).toBeNull();
  });

  // Test case 5: Input string is empty
  test('should return null when the string is empty', () => {
    const notes = '';
    expect(extractReservationUrl(notes)).toBeNull();
  });

  // Test case 6: Input string is null
  test('should return null when the string is null', () => {
    const notes = null;
    expect(extractReservationUrl(notes)).toBeNull();
  });

  // Test case 6a: Input string is undefined
  test('should return null when the string is undefined', () => {
    const notes = undefined;
    expect(extractReservationUrl(notes)).toBeNull();
  });

  // Additional test: URL at the beginning of the string
  test('should return the URL when it is at the beginning of the string', () => {
    const notes = 'http://start.com has the details';
    expect(extractReservationUrl(notes)).toBe('http://start.com');
  });

  // Additional test: URL at the end of the string
  test('should return the URL when it is at the end of the string', () => {
    const notes = 'Details are at https://end.com';
    expect(extractReservationUrl(notes)).toBe('https://end.com');
  });

  // Additional test: URL with query parameters
  test('should return the URL with query parameters', () => {
    const notes = 'Check https://example.com/path?param1=value1&param2=value2';
    expect(extractReservationUrl(notes)).toBe('https://example.com/path?param1=value1&param2=value2');
  });

  // Additional test: URL with a fragment identifier
  test('should return the URL with a fragment identifier', () => {
    const notes = 'See section https://example.com/page#section-3';
    expect(extractReservationUrl(notes)).toBe('https://example.com/page#section-3');
  });

  // Additional test: String with only a URL
  test('should return the URL when the string is just a URL', () => {
    const notes = 'https://only-url.com';
    expect(extractReservationUrl(notes)).toBe('https://only-url.com');
  });
});
