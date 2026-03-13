import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

const placeholders = [
  "Restaurant terrace 80 seats mediterranean style natural colors",
  "Boutique hotel rooftop lounge modern minimalist",
  "Beach club 200 seats tropical white and wood",
  "Camping glamping area 50 seats scandinavian style",
  "Rooftop bar 40 seats industrial chic urban feel",
];

const HeroSearch = () => {
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
          placeholder={isFocused ? "Describe your project..." : displayText}
          className="w-full bg-transparent text-sm font-body text-foreground placeholder:text-muted-foreground outline-none"
        />
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 font-body">
        Describe your space, style and needs — we'll guide you to the right solutions
      </p>
    </motion.div>
  );
};

export default HeroSearch;
