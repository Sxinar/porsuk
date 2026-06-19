"use client";

import { Bookmark } from "@/lib/bookmarks";
import { Star, Trash2, FolderPlus } from "lucide-react";

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onAddToCollection: (id: string) => void;
}

export function BookmarkCard({ 
  bookmark, 
  onDelete, 
  onToggleFavorite,
  onAddToCollection 
}: BookmarkCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:border-primary transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{bookmark.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onToggleFavorite(bookmark.id)}
            className={bookmark.favorite ? "text-yellow-500" : "text-gray-400"}
          >
            <Star size={20} />
          </button>
          <button onClick={() => onAddToCollection(bookmark.id)}>
            <FolderPlus size={20} />
          </button>
          <button 
            onClick={() => onDelete(bookmark.id)}
            className="text-red-500"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-2">{bookmark.excerpt}</p>
      <div className="flex gap-2 items-center text-xs text-gray-500">
        <span>{new Date(bookmark.savedAt).toLocaleDateString('tr-TR')}</span>
        {bookmark.readingTime && <span>• {bookmark.readingTime} dk</span>}
        {bookmark.tags.length > 0 && (
          <div className="flex gap-1 ml-auto">
            {bookmark.tags.map(tag => (
              <span key={tag} className="bg-gray-100 px-2 py-1 rounded">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
      <a 
        href={bookmark.url} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline mt-2 block"
      >
        {bookmark.url}
      </a>
    </div>
  );
}
