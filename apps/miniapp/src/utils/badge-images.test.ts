import { describe, it, expect } from 'vitest';
import { getBadgeImage } from './badge-images';

describe('getBadgeImage', () => {
  it('returns image url for valid badge code', () => {
    expect(getBadgeImage('helper_1')).toBeTruthy();
    expect(getBadgeImage('founder')).toBeTruthy();
    expect(getBadgeImage('pet_friend')).toBeTruthy();
    expect(getBadgeImage('guide_20')).toBeTruthy();
  });

  it('returns null for unknown or empty badge code', () => {
    expect(getBadgeImage('unknown_badge')).toBeNull();
    expect(getBadgeImage('')).toBeNull();
    expect(getBadgeImage(null)).toBeNull();
    expect(getBadgeImage(undefined)).toBeNull();
  });
});
