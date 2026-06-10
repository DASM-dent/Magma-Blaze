"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useScrollDirection } from "@/components/ui/ScrollDirectionProvider";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
  direction?: "up" | "left" | "right";
  amount?: number;
};

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 34,
  direction = "up",
  amount = 0.2,
}: ScrollRevealProps) {
  const reduceMotion = useReducedMotion();
  const scrollDirection = useScrollDirection();
  const offset = reduceMotion
    ? { x: 0, y: 0 }
    : direction === "left"
      ? { x: -distance, y: 0 }
      : direction === "right"
        ? { x: distance, y: 0 }
        : { x: 0, y: scrollDirection === "down" ? distance : -distance };

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, filter: reduceMotion ? "none" : "blur(7px)", ...offset }}
      whileInView={{ opacity: 1, x: 0, y: 0, filter: "blur(0px)" }}
      viewport={{ once: false, amount, margin: "-4% 0px -4% 0px" }}
      transition={{
        duration: reduceMotion ? 0.01 : scrollDirection === "down" ? 0.72 : 0.56,
        delay: reduceMotion ? 0 : delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
