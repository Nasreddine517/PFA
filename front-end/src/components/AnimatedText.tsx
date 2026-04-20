import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
  staggerChildren?: number;
}

export const AnimatedTitle = ({ text, className, delay = 0 }: AnimatedTextProps) => {
  const words = text.split(" ");
  return (
    <motion.span
      className={cn("inline-flex flex-wrap gap-x-3", className)}
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.12, delayChildren: delay } },
        hidden: {},
      }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          variants={{
            hidden: { opacity: 0, y: 40, filter: "blur(8px)" },
            visible: { opacity: 1, y: 0, filter: "blur(0px)" },
          }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="inline-block"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
};

export const AnimatedParagraph = ({ text, className, delay = 0 }: AnimatedTextProps) => {
  return (
    <motion.p
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
      className={className}
    >
      {text}
    </motion.p>
  );
};

export const CountUpNumber = ({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) => {
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay, type: "spring", stiffness: 100 }}
    >
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.2 }}>
        {value}{suffix}
      </motion.span>
    </motion.span>
  );
};