import { motion } from "framer-motion";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";

interface AnimatedButtonProps extends ButtonProps {
  glowColor?: string;
  children: React.ReactNode;
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, glowColor, children, variant, ...props }, ref) => {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className="relative inline-block"
      >
        {variant !== "outline" && variant !== "ghost" && (
          <motion.div
            className="absolute -inset-1 rounded-xl bg-primary/20 blur-lg"
            animate={{
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
        <Button
          ref={ref}
          variant={variant}
          className={cn("relative z-10", className)}
          {...props}
        >
          {children}
        </Button>
      </motion.div>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export default AnimatedButton;
