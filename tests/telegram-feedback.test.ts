import { describe, it, expect } from 'vitest';
import {
  buildFeedbackKeyboard,
  parseFeedbackCallback,
  feedbackAckText,
} from '../functions/api/telegram/webhook';

describe('buildFeedbackKeyboard', () => {
  it('returns a single row with hit and miss buttons', () => {
    const kb = buildFeedbackKeyboard();
    expect(kb.inline_keyboard).toHaveLength(1);
    expect(kb.inline_keyboard[0]).toHaveLength(2);

    const [hit, miss] = kb.inline_keyboard[0];
    expect(hit.text).toBe('Sol was right ✓');
    expect(hit.callback_data).toBe('feedback:hit');
    expect(miss.text).toBe('Sol missed ✗');
    expect(miss.callback_data).toBe('feedback:miss');
  });

  it('produces callback_data that round-trips through the parser', () => {
    for (const button of buildFeedbackKeyboard().inline_keyboard[0]) {
      expect(parseFeedbackCallback(button.callback_data)).not.toBeNull();
    }
  });
});

describe('parseFeedbackCallback', () => {
  it('parses hit votes', () => {
    expect(parseFeedbackCallback('feedback:hit')).toBe('hit');
  });

  it('parses miss votes', () => {
    expect(parseFeedbackCallback('feedback:miss')).toBe('miss');
  });

  it('returns null for non-feedback callback data', () => {
    expect(parseFeedbackCallback('checkin_state:clear')).toBeNull();
    expect(parseFeedbackCallback('checkin_area:mind')).toBeNull();
    expect(parseFeedbackCallback('')).toBeNull();
  });

  it('returns null for malformed feedback data', () => {
    expect(parseFeedbackCallback('feedback:')).toBeNull();
    expect(parseFeedbackCallback('feedback:maybe')).toBeNull();
    expect(parseFeedbackCallback('feedback:hit:extra')).toBeNull();
    expect(parseFeedbackCallback('FEEDBACK:HIT')).toBeNull();
  });
});

describe('feedbackAckText', () => {
  it('acknowledges a hit in Sol\'s voice', () => {
    expect(feedbackAckText('hit')).toBe('Noted — the field agrees.');
  });

  it('acknowledges a miss in Sol\'s voice', () => {
    expect(feedbackAckText('miss')).toBe('Thank you — Sol listens. Tomorrow sharpens.');
  });

  it('gives different lines for hit and miss', () => {
    expect(feedbackAckText('hit')).not.toBe(feedbackAckText('miss'));
  });
});
