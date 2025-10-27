export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

export function updatePageMeta(config: SEOConfig) {
  document.title = `${config.title} | LiLove`;
  
  const metaTags = {
    description: config.description,
    keywords: config.keywords?.join(', ') || 'personal growth, ai coach',
    'og:title': config.title,
    'og:description': config.description,
    'og:image': config.image || 'https://lilove.org/og-image.png',
    'og:url': config.url || window.location.href,
    'twitter:title': config.title,
    'twitter:description': config.description,
    'twitter:image': config.image || 'https://lilove.org/og-image.png'
  };
  
  Object.entries(metaTags).forEach(([name, content]) => {
    let meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute(name.includes(':') ? 'property' : 'name', name);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  });
}
