import { splitByKeyword } from '../splitByKeyword';

const matches = (text: string, keyword?: string) =>
  splitByKeyword(text, keyword)
    .filter((part) => part.isMatch)
    .map((part) => part.text);

describe('splitByKeyword', () => {
  it('returns the whole text unmatched without a keyword', () => {
    expect(splitByKeyword('Hello world', '')).toEqual([
      { text: 'Hello world', isMatch: false },
    ]);
    expect(splitByKeyword('Hello world', '   ')).toEqual([
      { text: 'Hello world', isMatch: false },
    ]);
  });

  it('matches whole words, ignoring case and keeping the original casing', () => {
    expect(splitByKeyword('Hello hello, HELLO!', 'hello')).toEqual([
      { text: 'Hello', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'hello', isMatch: true },
      { text: ', ', isMatch: false },
      { text: 'HELLO', isMatch: true },
      { text: '!', isMatch: false },
    ]);
  });

  it('does not match inside a longer English word', () => {
    expect(matches('hospitality and a hospital', 'hospital')).toEqual([
      'hospital',
    ]);
  });

  it('matches a phrase', () => {
    expect(matches('I said hello world today', 'hello world')).toEqual([
      'hello world',
    ]);
  });

  it('matches Thai text inside a longer run of text', () => {
    expect(matches('ไปโรงพยาบาลวันนี้', 'โรงพยาบาล')).toEqual(['โรงพยาบาล']);
  });

  it('treats regex characters in the keyword literally', () => {
    expect(matches('Is it (really) 1+1?', '1+1')).toEqual(['1+1']);
    expect(matches('a.b and axb', 'a.b')).toEqual(['a.b']);
  });

  it('highlights only an exact hashtag for a # keyword', () => {
    expect(matches('#hospital #hospitality hospital', '#Hospital')).toEqual([
      '#hospital',
    ]);
  });

  it('highlights a plain keyword inside a hashtag', () => {
    expect(splitByKeyword('Testing #ocean11search', 'search')).toEqual([
      { text: 'Testing #ocean11', isMatch: false },
      { text: 'search', isMatch: true },
    ]);
  });

  it('does not treat a # inside a word as a hashtag', () => {
    expect(matches('abc#tag', '#tag')).toEqual([]);
  });
});
