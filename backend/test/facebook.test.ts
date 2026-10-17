import { describe, expect, test } from 'bun:test'
import { isFacebookUrl } from '../src/facebook'

describe('isFacebookUrl', () => {
  test.each([
    'https://www.facebook.com/watch?v=1234567890',
    'https://www.facebook.com/reel/1234567890',
    'https://www.facebook.com/share/v/AbCdEf/',
    'https://m.facebook.com/story.php?story_fbid=1&id=2',
    'https://web.facebook.com/someone/videos/1234567890/',
    'https://fb.watch/abc123/',
    'http://facebook.com/watch/?v=1',
  ])('accepts %s', (url) => {
    expect(isFacebookUrl(url)).toBe(true)
  })

  test.each([
    'https://www.youtube.com/watch?v=abc',
    'https://facebook.com.evil.example/watch?v=1',
    'https://notfacebook.com/watch?v=1',
    'https://www.facebook.com/',
    'ftp://facebook.com/watch?v=1',
    'not a url',
    '',
    '--exec=rm -rf /',
  ])('rejects %s', (url) => {
    expect(isFacebookUrl(url)).toBe(false)
  })
})
