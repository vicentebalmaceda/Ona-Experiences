import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSiteAsset } from '../site/SiteAssetsProvider.jsx';

function DocumentMeta() {
  const { t, i18n } = useTranslation();
  const logo = useSiteAsset('logo');

  useEffect(() => {
    const icon = document.querySelector('link[rel="icon"]');
    if (icon && icon.getAttribute('href') !== logo.url) {
      icon.setAttribute('href', logo.url);
    }
  }, [logo.url]);

  useEffect(() => {
    document.title = t('meta.title');
    const description = t('meta.description');
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }, [t, i18n.language]);

  return null;
}

export default DocumentMeta;
