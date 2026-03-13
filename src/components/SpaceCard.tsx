import { motion } from "framer-motion";

interface SpaceCardProps {
  name: string;
  image: string;
  description: string;
  index: number;
}

const SpaceCard = ({ name, image, description, index }: SpaceCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      className="group cursor-pointer relative overflow-hidden rounded-sm"
    >
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3 className="font-display font-bold text-lg text-primary-foreground">{name}</h3>
        <p className="text-xs text-primary-foreground/70 font-body mt-1">{description}</p>
      </div>
    </motion.div>
  );
};

export default SpaceCard;
