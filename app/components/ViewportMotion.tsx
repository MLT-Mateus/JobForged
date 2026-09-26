"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useAnimationControls, useInView, type HTMLMotionProps, type TargetAndTransition } from "motion/react";

/** Preserve the approved loops while avoiding work outside the viewport or in a hidden tab. */
export function ViewportMotion({animate, transition, ...props}: Omit<HTMLMotionProps<"div">,"animate"> & {animate?:TargetAndTransition}) {
  const ref=useRef<HTMLDivElement>(null);
  const visible=useInView(ref,{margin:"80px"});
  const controls=useAnimationControls();
  const [foreground,setForeground]=useState(true);
  useEffect(()=>{const update=()=>setForeground(!document.hidden);update();document.addEventListener("visibilitychange",update);return()=>document.removeEventListener("visibilitychange",update)},[]);
  // Serialized values keep unrelated theme/menu renders from restarting the loop.
  const animationKey=JSON.stringify(animate);
  const transitionKey=JSON.stringify(transition);
  useEffect(()=>{
    if(visible&&foreground&&animationKey) void controls.start(JSON.parse(animationKey),transitionKey?JSON.parse(transitionKey):undefined);
    else controls.stop();
    return()=>controls.stop();
  },[visible,foreground,animationKey,transitionKey,controls]);
  return <motion.div {...props} ref={ref} animate={controls}/>;
}
