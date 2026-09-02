import { describe, it, expect } from 'vitest';
import { CONDITION_LABELS, GUIDE_STATUS_LABELS } from './mappers';
import { FEEDBACK_STATUS_CONFIG } from '../pages/event-detail/constants';

describe('A11y Text Contrast Colors', () => {
  it('CONDITION_LABELS should use compliant text color #B05E22 for good condition', () => {
    expect(CONDITION_LABELS.good.color).toBe('#B05E22');
  });

  it('GUIDE_STATUS_LABELS should use compliant text color #B05E22 for pending_review', () => {
    expect(GUIDE_STATUS_LABELS.pending_review.color).toBe('#B05E22');
  });

  it('FEEDBACK_STATUS_CONFIG should use compliant text color #B05E22 for received', () => {
    expect(FEEDBACK_STATUS_CONFIG.received.color).toBe('#B05E22');
  });
});
