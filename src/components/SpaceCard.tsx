import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

interface SpaceCardProps {
  name: string;
  image: string;
  description: string;
  index: number;
}

const SPACE_IDS: Record<string, string> = {
  "Restaurants": "restaurant",
  "Hotels":      "hotel",
  "Rooftops":    "rooftop",
  "Beach Clubs": "beachclub",
  "Campings":    "camping",
};

const SpaceCard = ({ name, image, description, index }: SpaceCardProps) => {
  const navigate = useNavigate();
  const spaceId = SPACE_IDS[name] || "all";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08, duration: 0.5 }}
      onClick={() => navigate(`/inspirations?space=${spaceId}`)}
      className="group relative aspect-[3/4] overflow-hidden rounded-sm cursor-pointer"
    >
      <img
        src={image}
        alt={name}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="font-display font-bold text-white text-sm leading-tight">{name}</h3>
        <p className="text-white/75 text-xs font-body mt-1 leading-snug">{description}</p>
      </div>
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-display font-semibold text-white bg-black/30 backdrop-blur-sm rounded-full px-2.5 py-1">
          Voir →
        </span>
      </div>
    </motion.div>
  );
};

export default SpaceCard;
