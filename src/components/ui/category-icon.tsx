import {
  Flower2,
  Hand,
  Leaf,
  ScissorsLineDashed,
  Sparkles,
  type LucideProps,
} from "lucide-react";

const icons = {
  ScissorsLineDashed,
  Sparkles,
  Flower2,
  Hand,
  Leaf,
};

interface CategoryIconProps extends LucideProps {
  name: keyof typeof icons | string;
}

export function CategoryIcon({ name, ...props }: CategoryIconProps) {
  const Icon = icons[name as keyof typeof icons] ?? Sparkles;

  return <Icon {...props} />;
}
