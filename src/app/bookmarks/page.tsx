"use client";

import { useState, useEffect } from "react";
import { BookmarkManager, Bookmark, Collection } from "@/lib/bookmarks";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { Search, Plus, FolderOpen } from "lucide-react";

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const manager = new BookmarkManager();

  useEffect(() => {
    setBookmarks(manager.getBookmarks());
    setCollections(manager.getCollections());
  }, []);

  const handleDelete = (id: string) => {
    manager.deleteBookmark(id);
    setBookmarks(manager.getBookmarks());
  };

  const handleToggleFavorite = (id: string) => {
    const updated = bookmarks.map(b => 
      b.id === id ? { ...b, favorite: !b.favorite } : b
    );
    setBookmarks(updated);
    localStorage.setItem('porsuk_bookmarks', JSON.stringify(updated));
  };

  const handleAddToCollection = (bookmarkId: string) => {
    // TODO: Show collection selector modal
    console.log("Add to collection:", bookmarkId);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setBookmarks(manager.searchBookmarks(searchQuery));
    } else {
      setBookmarks(manager.getBookmarks());
    }
  };

  const filteredBookmarks = selectedCollection
    ? bookmarks.filter(b => b.collectionId === selectedCollection)
    : bookmarks;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Yer İşaretlerim</h1>
        <button className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <Plus size={20} />
          Yeni Koleksiyon
        </button>
      </div>

      <div className="mb-6 flex gap-4">
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            placeholder="Yer işaretlerinde ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 border rounded-lg px-4 py-2"
          />
          <button 
            onClick={handleSearch}
            className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Search size={20} />
            Ara
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-3">
          <div className="border rounded-lg p-4">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <FolderOpen size={20} />
              Koleksiyonlar
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedCollection(null)}
                className={`w-full text-left px-3 py-2 rounded ${
                  !selectedCollection ? 'bg-primary/10' : 'hover:bg-gray-100'
                }`}
              >
                Tümü ({bookmarks.length})
              </button>
              {collections.map(collection => (
                <button
                  key={collection.id}
                  onClick={() => setSelectedCollection(collection.id)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedCollection === collection.id 
                      ? 'bg-primary/10' 
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: collection.color }}
                    />
                    <span>{collection.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="col-span-9">
          <div className="space-y-4">
            {filteredBookmarks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Henüz yer işareti yok
              </div>
            ) : (
              filteredBookmarks.map(bookmark => (
                <BookmarkCard
                  key={bookmark.id}
                  bookmark={bookmark}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                  onAddToCollection={handleAddToCollection}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
