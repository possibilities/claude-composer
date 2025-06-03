import { describe, it, expect } from 'vitest'

function matchDomain(domain: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === domain) {
      return true
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern
        .split('*')
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(domain)) {
        return true
      }
    }
  }
  return false
}

describe('Domain matching', () => {
  it('should match exact domains', () => {
    const patterns = ['github.com', 'gitlab.com']

    expect(matchDomain('github.com', patterns)).toBe(true)
    expect(matchDomain('gitlab.com', patterns)).toBe(true)
    expect(matchDomain('bitbucket.com', patterns)).toBe(false)
  })

  it('should match wildcard patterns at the beginning', () => {
    const patterns = ['*.shopify.com', '*.github.io']

    expect(matchDomain('shop.shopify.com', patterns)).toBe(true)
    expect(matchDomain('admin.shopify.com', patterns)).toBe(true)
    expect(matchDomain('mysite.github.io', patterns)).toBe(true)
    expect(matchDomain('shopify.com', patterns)).toBe(false)
    expect(matchDomain('github.io', patterns)).toBe(false)
    expect(matchDomain('example.com', patterns)).toBe(false)
  })

  it('should match wildcard patterns at the end', () => {
    const patterns = ['docs.*', 'api.*']

    expect(matchDomain('docs.google.com', patterns)).toBe(true)
    expect(matchDomain('docs.microsoft.com', patterns)).toBe(true)
    expect(matchDomain('api.github.com', patterns)).toBe(true)
    expect(matchDomain('docs', patterns)).toBe(false)
    expect(matchDomain('api', patterns)).toBe(false)
    expect(matchDomain('example.docs.com', patterns)).toBe(false)
  })

  it('should match wildcard patterns in the middle', () => {
    const patterns = ['docs.*.com', 'api.*.io']

    expect(matchDomain('docs.google.com', patterns)).toBe(true)
    expect(matchDomain('docs.company.com', patterns)).toBe(true)
    expect(matchDomain('api.service.io', patterns)).toBe(true)
    expect(matchDomain('docs.com', patterns)).toBe(false)
    expect(matchDomain('api.io', patterns)).toBe(false)
    expect(matchDomain('docs.google.io', patterns)).toBe(false)
  })

  it('should match multiple wildcards', () => {
    const patterns = ['*.*.example.com', '*-api.*.com']

    expect(matchDomain('sub.domain.example.com', patterns)).toBe(true)
    expect(matchDomain('a.b.example.com', patterns)).toBe(true)
    expect(matchDomain('user-api.service.com', patterns)).toBe(true)
    expect(matchDomain('admin-api.company.com', patterns)).toBe(true)
    expect(matchDomain('example.com', patterns)).toBe(false)
    expect(matchDomain('domain.example.com', patterns)).toBe(false)
    expect(matchDomain('api.service.com', patterns)).toBe(false)
  })

  it('should handle single wildcard matching everything', () => {
    const patterns = ['*']

    expect(matchDomain('github.com', patterns)).toBe(true)
    expect(matchDomain('any.domain.com', patterns)).toBe(true)
    expect(matchDomain('localhost', patterns)).toBe(true)
    expect(matchDomain('192.168.1.1', patterns)).toBe(true)
  })

  it('should handle empty patterns array', () => {
    const patterns: string[] = []

    expect(matchDomain('github.com', patterns)).toBe(false)
  })

  it('should handle special regex characters in domain parts', () => {
    const patterns = ['*.example.com', 'api.*.com']

    expect(matchDomain('sub.example.com', patterns)).toBe(true)
    expect(matchDomain('api.service.com', patterns)).toBe(true)
    expect(matchDomain('any.thing.example.com', patterns)).toBe(true)
  })
})
