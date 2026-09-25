import { BrandAsset } from "./BrandAsset";

type JobForgedLoadingAnimationProps = {
  size?: number;
  className?: string;
};

/** Reusable JobForged loader. The surrounding element supplies status semantics. */
export function JobForgedLoadingAnimation({
  size = 112,
  className = "",
}: JobForgedLoadingAnimationProps) {
  return (
    <BrandAsset
      className={className}
      src="/brand/jobforged-loader-rotating.svg"
      alt=""
      width={size}
      height={size}
    />
  );
}
