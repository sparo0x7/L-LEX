import { getStored, setStored } from './storage.ts';

export function getFavorites(): string[] {
  return getStored<string[]>('favorites') ?? [];
}

export function isFavorite(articleId: string): boolean {
  return getFavorites().includes(articleId);
}

/** Returns the new favorite state for the article. */
export function toggleFavorite(articleId: string): boolean {
  const favorites = getFavorites();
  const index = favorites.indexOf(articleId);
  if (index === -1) {
    setStored('favorites', [articleId, ...favorites]);
    return true;
  }
  favorites.splice(index, 1);
  setStored('favorites', favorites);
  return false;
}
