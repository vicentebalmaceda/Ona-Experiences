import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

function DocumentMeta() {
  const { t, i18n } = useTranslation();

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
