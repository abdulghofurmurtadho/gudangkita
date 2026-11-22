import type { EnvironmentInfo } from '../types';

interface NavigatorWithUAData extends Navigator {
  userAgentData?: {
    platform?: string;
    brands?: Array<{ brand: string; version: string }>;
  };
}

function detectBrowser(userAgent: string): string {
  if (!userAgent) {
    return 'Lingkungan Non-Browser (Node/Headless)';
  }
  if (/Edg\//i.test(userAgent)) {
    const match = /Edg\/([\d.]+)/i.exec(userAgent);
    return match ? `Microsoft Edge ${match[1]}` : 'Microsoft Edge';
  }
  if (/OPR\//i.test(userAgent)) {
    const match = /OPR\/([\d.]+)/i.exec(userAgent);
    return match ? `Opera ${match[1]}` : 'Opera';
  }
  if (/Chrome\//i.test(userAgent) && !/Chromium/i.test(userAgent)) {
    const match = /Chrome\/([\d.]+)/i.exec(userAgent);
    return match ? `Google Chrome ${match[1]}` : 'Google Chrome';
  }
  if (/Firefox\//i.test(userAgent)) {
    const match = /Firefox\/([\d.]+)/i.exec(userAgent);
    return match ? `Mozilla Firefox ${match[1]}` : 'Mozilla Firefox';
  }
  if (/Safari\//i.test(userAgent) && !/Chrome/i.test(userAgent)) {
    const match = /Version\/([\d.]+)/i.exec(userAgent);
    return match ? `Apple Safari ${match[1]}` : 'Apple Safari';
  }
  if (/Node\.js/i.test(userAgent)) {
    return 'Node.js';
  }
  return 'Browser Lainnya';
}

function detectPlatform(nav: NavigatorWithUAData | undefined, userAgent: string): string {
  const uaPlatform = nav?.userAgentData?.platform?.trim();
  if (uaPlatform) {
    return uaPlatform;
  }

  const rawPlatform = nav?.platform?.trim();
  if (rawPlatform) {
    return rawPlatform;
  }

  if (/Windows/i.test(userAgent)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'macOS';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Linux/i.test(userAgent)) return 'Linux';

  return 'Tidak terdeteksi';
}

/**
 * Mengumpulkan informasi lingkungan eksekusi benchmark (browser, platform, inti CPU)
 * secara aman untuk browser, Web Worker, maupun lingkungan Node/SSR.
 */
export function collectEnvironmentInfo(): EnvironmentInfo {
  const hasNavigator = typeof navigator !== 'undefined';
  const nav = hasNavigator ? (navigator as NavigatorWithUAData) : undefined;
  const userAgent = nav?.userAgent ?? '';

  const hardwareConcurrency =
    typeof nav?.hardwareConcurrency === 'number' &&
    Number.isFinite(nav.hardwareConcurrency)
      ? nav.hardwareConcurrency
      : null;

  const language = nav?.language || 'id-ID';

  return {
    browser: detectBrowser(userAgent),
    platform: detectPlatform(nav, userAgent),
    userAgent: userAgent || 'Node.js / Lingkungan Pengujian',
    hardwareConcurrency,
    language,
    timerNote:
      'Waktu diukur dengan performance.now() (resolusi dapat terkuantisasi browser ~0,005–0,1 ms); gunakan nilai median lintas pengulangan setelah warm-up.',
  };
}
