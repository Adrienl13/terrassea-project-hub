import { useState, useEffect } from "react";
import { Search, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const placeholders = [
  "terrace restaurant 80 seats mediterranean style",
  "stackable restaurant terrace chairs",
  "outdoor HPL table",
  "rooftop lounge furniture",
  "bistro chairs blue white",
];

interface SmartSearchProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

const SmartSearch = ({ onSearch, isLoading }: SmartSearchProps) => {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");

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

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSearch(inputValue.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="w-full max-w-2xl mx-auto"
    >
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
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            if (!inputValue) setIsFocused(false);
          }}
          onKeyDown={handleKeyDown}
          placeholder={isFocused ? "Describe what you need..." : displayText}
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
                Search <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 font-body">
        Search a product or describe your project — we'll adapt automatically
      </p>
    </motion.div>
  );
};

export default SmartSearch;
