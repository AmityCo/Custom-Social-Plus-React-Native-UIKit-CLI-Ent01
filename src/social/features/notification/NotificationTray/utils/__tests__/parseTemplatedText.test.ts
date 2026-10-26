import { parseTemplatedText } from '../parseTemplatedText';

describe('parseTemplatedText', () => {
  it('highlights each placeholder and keeps the text between them', () => {
    expect(
      parseTemplatedText(
        '{{ user: u1 }} and {{ user: u2 }} posted in {{ community: c1 }}',
        'Baimon and bai posted in Bai community'
      )
    ).toEqual([
      { text: 'Baimon', isHighlighted: true },
      { text: ' and ', isHighlighted: false },
      { text: 'bai', isHighlighted: true },
      { text: ' posted in ', isHighlighted: false },
      { text: 'Bai community', isHighlighted: true },
    ]);
  });

  it('reads names with emoji and punctuation out of the text', () => {
    expect(
      parseTemplatedText(
        '{{ community: c1 }} has event {{ event: e1 }}',
        'Designer 🎨 has event Monday'
      )
    ).toEqual([
      { text: 'Designer 🎨', isHighlighted: true },
      { text: ' has event ', isHighlighted: false },
      { text: 'Monday', isHighlighted: true },
    ]);
  });

  it('highlights a known phrase when there are no placeholders', () => {
    expect(
      parseTemplatedText(
        'Your profile information was reset by an admin.',
        'Your profile information was reset by an admin.'
      )
    ).toEqual([
      { text: 'Your profile information was reset', isHighlighted: true },
      { text: ' by an admin.', isHighlighted: false },
    ]);
  });

  it('returns plain text when there is nothing to highlight', () => {
    expect(
      parseTemplatedText('Something happened', 'Something happened')
    ).toEqual([{ text: 'Something happened', isHighlighted: false }]);
  });

  it('keeps the rest of the text when the template does not match it', () => {
    expect(
      parseTemplatedText('{{ user: u1 }} commented', 'Cherry replied')
    ).toEqual([{ text: 'Cherry replied', isHighlighted: true }]);
  });

  it('handles missing text', () => {
    expect(parseTemplatedText(undefined, undefined)).toEqual([
      { text: '', isHighlighted: false },
    ]);
  });
});
