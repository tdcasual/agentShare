import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiFetchMock = vi.fn();

vi.mock('@/lib/api-client', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

describe('docs api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('normalizes list responses from categories/files into items', async () => {
    apiFetchMock.mockResolvedValue({
      categories: ['guides'],
      files: [
        {
          category: 'guides',
          name: 'getting-started',
          title: 'Getting Started',
        },
      ],
    });

    const { listPublicDocs } = await import('./api');

    await expect(listPublicDocs()).resolves.toEqual({
      items: [
        {
          category: 'guides',
          filename: 'getting-started',
          title: 'Getting Started',
        },
      ],
    });
  });

  it('normalizes doc detail responses from name to filename', async () => {
    apiFetchMock.mockResolvedValue({
      category: 'guides',
      name: 'getting-started',
      title: 'Getting Started',
      content: '# Hello',
    });

    const { getPublicDoc } = await import('./api');

    await expect(getPublicDoc('guides', 'getting-started')).resolves.toEqual({
      category: 'guides',
      filename: 'getting-started',
      title: 'Getting Started',
      content: '# Hello',
    });
  });
});
