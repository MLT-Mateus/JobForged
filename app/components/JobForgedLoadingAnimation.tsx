import { BrandAsset } from "./BrandAsset";

type JobForgedLoadingAnimationProps = {
  size?: number;
  className?: string;
  variant?: "primary" | "inverted";
};

/** Reusable JobForged loader. The surrounding element supplies status semantics. */
export function JobForgedLoadingAnimation({
  size = 112,
  className = "",
  variant = "primary",
}: JobForgedLoadingAnimationProps) {
  return (
    <BrandAsset
      className={className}
      src={variant === "inverted" ? "/brand/jobforged-loader-rotating-alternate.svg" : "/brand/jobforged-loader-rotating.svg"}
      alt=""
      width={size}
      height={size}
    />
  );
}
