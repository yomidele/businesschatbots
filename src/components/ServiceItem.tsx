import { Check } from "lucide-react";

interface ServiceItemProps {
  text: string;
}

const ServiceItem = ({ text }: ServiceItemProps) => {
  return (
    <div className="flex items-center gap-1.5 text-foreground">
      <div className="flex-shrink-0 w-4 h-4 rounded bg-gradient-to-br from-neon-pink to-neon-orange flex items-center justify-center">
        <Check className="w-3 h-3 text-foreground" strokeWidth={3} />
      </div>
      <span className="text-sm font-semibold leading-tight uppercase tracking-wide">
        {text}
      </span>
    </div>
  );
};

export default ServiceItem;
