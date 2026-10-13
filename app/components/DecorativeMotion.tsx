import type { HTMLAttributes } from "react";

type DecorativeMotionProps = HTMLAttributes<HTMLDivElement> & {
  animate?: unknown;
  transition?: unknown;
};

/** Server-rendered decorative wrapper; CSS provides motion without a client animation runtime. */
export function DecorativeMotion({ animate, transition, ...props }: DecorativeMotionProps) {
  void animate;
  void transition;
  return <div {...props} />;
}
