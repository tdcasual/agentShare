module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm start',
      startServerReadyPattern: 'Ready in',
      startServerReadyTimeout: 30000,
      url: ['http://localhost:3000/login'],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags: '--headless=new --no-sandbox --disable-gpu',
      },
    },
    assert: {
      // 仅检查类别总分，不检查单项审计（避免 Next.js 框架级行为导致阻塞）
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': 'off',
        'categories:pwa': 'off',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
