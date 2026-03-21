import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useSearchAutocomplete, type SearchSuggestion } from "@/hooks/useSearchAutocomplete";

interface SmartSearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const SmartSearch = ({ onSearch, isLoading }: SmartSearchProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const placeholders = [
    t('search.placeholder1', 'terrace restaurant 80 seats mediterranean style'),
    t('search.placeholder2', 'stackable restaurant terrace chairs'),
    t('search.placeholder3', 'outdoor HPL table'),
    t('search.placeholder4', 'rooftop lounge furniture'),
    t('search.placeholder5', 'bistro chairs blue white'),
  ];
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");

  // Autocomplete state
  const { suggestions, isLoading: suggestionsLoading } = useSearchAutocomplete(inputValue);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const grouped = groupSuggestions(suggestions);
  const flatList = suggestions;

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Open dropdown when suggestions arrive
  useEffect(() => {
    if (inputValue.trim().length >= 2 && (suggestions.length > 0 || suggestionsLoading)) {
      setDropdownOpen(true);
    } else {
      setDropdownOpen(false);
    }
  }, [suggestions, suggestionsLoading, inputValue]);

  // Animated placeholder
  useEffect(() => {
    if (isFocused) return;

    const text = placeholders[currentPlaceholder];

    if (isTyping) {
      if (displayText.length < text.length) {
        const timeout = setTimeout(() => {
          setDisplayText(text.slice(0, displayText.length + 1));
        }, 35);
        return () => clearTimeout(timeout);
      } else {
        const timeout = setTimeout(() => setIsTyping(false), 2000);
        return () => clearTimeout(timeout);
      }
    } else {
      if (displayText.length > 0) {
        const timeout = setTimeout(() => {
          setDisplayText(displayText.slice(0, -1));
        }, 20);
        return () => clearTimeout(timeout);
      } else {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
        setIsTyping(true);
      }
    }
  }, [displayText, isTyping, currentPlaceholder, isFocused]);

  const selectSuggestion = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.label);
    setDropdownOpen(false);
    setActiveIndex(-1);
    navigate(suggestion.url);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      setDropdownOpen(false);
      onSearch(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setDropdownOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (!dropdownOpen || flatList.length === 0) {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div ref={wrapperRef} className="relative">
        <div
          className={`flex items-center gap-3 px-6 py-4 rounded-full border transition-all duration-300 ${
            isFocused
              ? "border-foreground shadow-lg bg-background"
              : "border-border bg-card hover:border-muted-foreground/30"
          }`}
        >
          <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              setIsFocused(true);
              if (inputValue.trim().length >= 2 && suggestions.length > 0) setDropdownOpen(true);
            }}
            onBlur={() => {
              if (!inputValue) setIsFocused(false);
            }}
            onKeyDown={handleKeyDown}
            placeholder={isFocused ? t('search.focusPlaceholder', 'Describe what you need...') : displayText}
            className="w-full bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground outline-none"
          />
          {inputValue.trim() && (
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-display font-semibold bg-foreground text-primary-foreground rounded-full px-4 py-2 hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  {t('search.button', 'Search')} <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>

        {/* Autocomplete dropdown */}
        {dropdownOpen && inputValue.trim().length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[400px] overflow-y-auto">
            {suggestionsLoading && suggestions.length === 0 && (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground font-body">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("searchSuggestions.searching", "Searching...")}
              </div>
            )}

            {!suggestionsLoading && suggestions.length === 0 && (
              <div className="px-4 py-3 text-sm text-muted-foreground font-body">
                {t("searchSuggestions.noResults", "No results for '{{query}}'", { query: inputValue.trim() })}
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

      <p className="text-center text-xs text-muted-foreground mt-4 font-body">
        {t('search.hint', "Search a product or describe your project — we'll adapt automatically")}
      </p>
    </motion.div>
  );
};

/** Group suggestions by type */
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

export default SmartSearch;
