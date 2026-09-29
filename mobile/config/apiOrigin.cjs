function resolveApiOrigin(env = process.env) {
  const isRelease = env.LILOVE_RELEASE_BUILD === '1' || env.EAS_BUILD_PROFILE === 'production';
  const input = env.EXPO_PUBLIC_API_URL;
  if (input === undefined) {
    if (isRelease) throw new Error('EXPO_PUBLIC_API_URL is required for a release build.');
    return 'https://lilove.org';
  }

  const invalid = () =>
    new Error(
      'EXPO_PUBLIC_API_URL must be an HTTPS origin without credentials, path, query or fragment.'
    );
  // Check the original text as well as parsed components: URL normalizes dot
  // paths and drops empty ?/# separators, which are not allowed in an origin.
  if (
    typeof input !== 'string' ||
    /[\s\\]/u.test(input) ||
    !/^https:\/\/[^/?#]+\/?$/i.test(input)
  ) {
    throw invalid();
  }
  let url;
  try {
    url = new URL(input);
  } catch {
    throw invalid();
  }
  if (
    url.protocol !== 'https:' ||
    input.includes('@') ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw invalid();
  }
  const hostname = url.hostname.toLowerCase().replace(/\.+$/, '');
  if (isRelease && (hostname === 'lilove.org' || hostname.endsWith('.lilove.org'))) {
    throw new Error(
      'The inactive LiLove domain cannot be used for a release build. Configure a verified HTTPS origin.'
    );
  }
  if (isRelease && hostname === 'lilove-qa.onrender.com') {
    throw new Error('The protected QA origin cannot be used for a release build.');
  }
  return url.origin;
}

module.exports = { resolveApiOrigin };
