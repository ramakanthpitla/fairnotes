'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

type Product = {
  id: string;
  sku: string;
  title: string;
  description: string;
  type: string;
  thumbnail: string | null;
  isFree: boolean;
  pricing: Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>;
};

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/products/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status !== 'authenticated') {
      router.push('/auth/signin?callbackUrl=/browse');
      return;
    }
    setQuery(e.target.value);
  };

  const handleInputFocus = () => {
    if (status !== 'authenticated') {
      router.push('/auth/signin?callbackUrl=/browse');
      return;
    }
    if (results.length > 0) setIsOpen(true);
  };

  return (
    <div
      ref={searchRef}
      className="relative w-full max-w-md group"
    >
      <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-purple-500/40 via-indigo-500/40 to-blue-500/40 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" aria-hidden="true" />
      <div className="relative rounded-xl border border-primary/30 bg-background/90 backdrop-blur-sm shadow-[0_10px_30px_rgba(79,70,229,0.25)] transition duration-300 group-hover:border-primary/60 group-hover:shadow-[0_15px_40px_rgba(79,70,229,0.35)]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/70" />
        <Input
          type="text"
          placeholder={status === 'authenticated' ? 'Search products...' : 'Sign in to search...'}
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className="pl-9 pr-9 bg-transparent border-none focus-visible:ring-0 focus-visible:outline-none"
          readOnly={status !== 'authenticated'}
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
          <div className="p-2">
            {results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className="block p-3 hover:bg-muted rounded-md transition-colors"
              >
                <div className="flex items-start gap-3">
                  {product.thumbnail && (
                    <img
                      src={product.thumbnail}
                      alt={product.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{product.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span className="capitalize">{product.type}</span>
                      <span>•</span>
                      <span className="font-mono text-xs">{product.sku}</span>
                    </div>
                    {product.pricing.length > 0 && !product.isFree && (
                      <div className="text-xs font-semibold text-primary mt-1">
                        From ₹{product.pricing[0].price}
                      </div>
                    )}
                    {product.isFree && (
                      <div className="text-xs font-semibold text-green-600 mt-1">
                        Free
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isOpen && query && results.length === 0 && !isSearching && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground z-50">
          No products found matching "{query}"
        </div>
      )}

      {isSearching && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground z-50">
          Searching...
        </div>
      )}
    </div>
  );
}
