import { Plus } from "lucide-react";
import { useProjectCart } from "@/contexts/ProjectCartContext";
import { Product } from "@/data/products";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useProjectCart();

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} added to your project`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5 }}
      className="group"
    >
      <div className="aspect-square overflow-hidden bg-card rounded-sm mb-4">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          loading="lazy"
        />
      </div>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-sm text-foreground truncate">
            {product.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 font-body">
            {product.description}
          </p>
          <p className="text-sm font-display font-medium text-foreground mt-2">
            {product.price}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex-shrink-0 mt-1 flex items-center gap-1.5 text-xs font-body text-muted-foreground hover:text-foreground border border-border hover:border-foreground rounded-full px-3 py-1.5 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
