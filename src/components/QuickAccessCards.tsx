import { motion } from "framer-motion";
import { Sparkles, ShoppingBag, Compass } from "lucide-react";

interface QuickAccessCardsProps {
  onCreateProject: () => void;
  onExploreProducts: () => void;
  onDiscover: () => void;
}

const QuickAccessCards = ({ onCreateProject, onExploreProducts, onDiscover }: QuickAccessCardsProps) => {
  const cards = [
    {
      icon: Sparkles,
      title: "Create a terrace project",
      description: "Describe your space and get 3 curated design concepts",
      action: onCreateProject,
    },
    {
      icon: ShoppingBag,
      title: "Explore products",
      description: "Browse our curated catalogue of hospitality furniture",
      action: onExploreProducts,
    },
    {
      icon: Compass,
      title: "Discover inspirations",
      description: "Find ideas by style, space type or ambience",
      action: onDiscover,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mx-auto mt-10">
      {cards.map((card, i) => (
        <motion.button
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
          onClick={card.action}
          className="text-left p-5 rounded-sm border border-border bg-card hover:border-foreground/30 transition-all group"
        >
          <card.icon className="h-5 w-5 text-foreground mb-3 group-hover:scale-110 transition-transform" />
          <h3 className="font-display font-semibold text-sm text-foreground">
            {card.title}
          </h3>
          <p className="text-xs text-muted-foreground font-body mt-1.5 leading-relaxed">
            {card.description}
          </p>
        </motion.button>
      ))}
    </div>
  );
};

export default QuickAccessCards;
