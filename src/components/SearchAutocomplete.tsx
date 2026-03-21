import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, X, Loader2 } from "lucide-react";
import { useSearchAutocomplete, type SearchSuggestion } from "@/hooks/useSearchAutocomplete";

interface SearchAutocompleteProps {
  /** Called when the user presses Enter or clicks the search button with the raw query */
  onSearch?: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
  /** If true, navigates on suggestion click; if false, only calls onSearch */
  navigateOnSelect?: boolean;
  /** Controlled value (optional) */
  value?: string;
  /** Controlled onChange (optional) */
  onChange?: (value: string) => void;
}

const SearchAutocomplete = ({
  onSearch,
  placeholder,
  className = "",
  navigateOnSelect = true,
  value: controlledValue,
  onChange: controlledOnChange,
}: SearchAutocompleteProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Support both controlled and uncontrolled modes
  const [internalValue, setInternalValue] = useState("");
  const query = controlledValue !== undefined ? controlledValue : internalValue;
  const setQuery = useCallback(
    (val: string) => {
      if (controlledOnChange) controlledOnChange(val);
      else setInternalValue(val);
    },
    [controlledOnChange]
  );

  const { suggestions, isLoading } = useSearchAutocomplete(query);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Group suggestions by type
  const grouped = groupSuggestions(suggestions);
  const flatList = suggestions; // for keyboard navigation

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Open dropdown when suggestions arrive and query is long enough
  useEffect(() => {
    if (query.trim().length >= 2 && (suggestions.length > 0 || isLoading)) {
      setIsOpen(true);
    }
  }, [suggestions, isLoading, query]);

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.label);
    setIsOpen(false);
    if (navigateOnSelect) {
      navigate(suggestion.url);
    } else if (onSearch) {
      onSearch(suggestion.label);
    }
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setIsOpen(false);
    if (onSearch) onSearch(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!isOpen || flatList.length === 0) {
      if (e.key === "Enter") handleSubmit();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < flatList.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : flatList.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < flatList.length) {
        selectSuggestion(flatList[activeIndex]);
      } else {
        handleSubmit();
      }
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (query.trim().length >= 2 && suggestions.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? t("products.searchPlaceholder", "Search products, partners, styles...")}
          className="w-full pl-11 pr-10 py-3 text-sm font-body bg-card border border-border rounded-full focus:outline-none focus:ring-1 focus:ring-foreground/20 transition-all placeholder:text-muted-foreground"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {isLoading && suggestions.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground font-body">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("searchSuggestions.searching", "Searching...")}
            </div>
          )}

          {!isLoading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground font-body">
              {t("searchSuggestions.noResults", "No results for '{{query}}'", { query: query.trim() })}
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.type}>
              <p className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground px-4 pt-3 pb-1">
                {t(`searchSuggestions.${group.type}s`, group.type)}
              </p>
              {group.items.map((suggestion) => {
                const idx = flatList.indexOf(suggestion);
                return (
                  <button
                    key={suggestion.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      idx === activeIndex
                        ? "bg-muted/60"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    {suggestion.imageUrl && (
                      <img
                        src={suggestion.imageUrl}
                        alt=""
                        className="w-8 h-8 rounded-sm object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-body text-foreground truncate">
                        {suggestion.label}
                      </p>
                      {suggestion.sublabel && (
                        <p className="text-[11px] font-body text-muted-foreground truncate">
                          {suggestion.sublabel}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/** Group suggestions by type, maintaining order: product, partner, category, style */
function groupSuggestions(suggestions: SearchSuggestion[]) {
  const order: SearchSuggestion["type"][] = ["product", "partner", "category", "style"];
  const map = new Map<SearchSuggestion["type"], SearchSuggestion[]>();

  for (const s of suggestions) {
    if (!map.has(s.type)) map.set(s.type, []);
    map.get(s.type)!.push(s);
  }

  return order
    .filter((type) => map.has(type))
    .map((type) => ({ type, items: map.get(type)! }));
}

export default SearchAutocomplete;
