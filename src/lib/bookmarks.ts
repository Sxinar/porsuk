export interface Bookmark {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  savedAt: Date;
  collectionId?: string;
  tags: string[];
  readingTime?: number;
  favorite: boolean;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  bookmarks: Bookmark[];
  createdAt: Date;
  color: string;
}

export class BookmarkManager {
  private readonly BOOKMARKS_KEY = 'porsuk_bookmarks';
  private readonly COLLECTIONS_KEY = 'porsuk_collections';

  saveBookmark(bookmark: Omit<Bookmark, 'id' | 'savedAt'>): Bookmark {
    const bookmarks = this.getBookmarks();
    const newBookmark: Bookmark = {
      ...bookmark,
      id: crypto.randomUUID(),
      savedAt: new Date()
    };
    bookmarks.push(newBookmark);
    localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
    return newBookmark;
  }

  getBookmarks(): Bookmark[] {
    const stored = localStorage.getItem(this.BOOKMARKS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  deleteBookmark(id: string): void {
    const bookmarks = this.getBookmarks().filter(b => b.id !== id);
    localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
  }

  createCollection(name: string, description: string, color: string): Collection {
    const collections = this.getCollections();
    const newCollection: Collection = {
      id: crypto.randomUUID(),
      name,
      description,
      bookmarks: [],
      createdAt: new Date(),
      color
    };
    collections.push(newCollection);
    localStorage.setItem(this.COLLECTIONS_KEY, JSON.stringify(collections));
    return newCollection;
  }

  getCollections(): Collection[] {
    const stored = localStorage.getItem(this.COLLECTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  addToCollection(bookmarkId: string, collectionId: string): void {
    const bookmarks = this.getBookmarks();
    const bookmark = bookmarks.find(b => b.id === bookmarkId);
    if (bookmark) {
      bookmark.collectionId = collectionId;
      localStorage.setItem(this.BOOKMARKS_KEY, JSON.stringify(bookmarks));
    }
  }

  searchBookmarks(query: string): Bookmark[] {
    const bookmarks = this.getBookmarks();
    const lowerQuery = query.toLowerCase();
    return bookmarks.filter(b => 
      b.title.toLowerCase().includes(lowerQuery) ||
      b.excerpt.toLowerCase().includes(lowerQuery) ||
      b.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
  }
}
