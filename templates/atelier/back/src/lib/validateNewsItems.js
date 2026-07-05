export function validateNewsItems(items) {
  if (!Array.isArray(items)) return 'newsItems doit être un tableau';
  for (const item of items) {
    if (!item.title || typeof item.title !== 'string' || item.title.trim() === '') {
      return 'Chaque actualité doit avoir un titre';
    }
    if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      return 'Chaque actualité doit avoir une date valide (YYYY-MM-DD)';
    }
    if (item.endDate && !/^\d{4}-\d{2}-\d{2}$/.test(item.endDate)) {
      return 'La date de fin doit être au format YYYY-MM-DD';
    }
    if (item.link && !/^https?:\/\/.+/.test(item.link)) {
      return 'Le lien doit commencer par http:// ou https://';
    }
  }
  return null;
}
