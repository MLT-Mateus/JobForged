import Image, { type ImageProps } from "next/image";

const darkAssets: Record<string, string> = {
  "/brand/jobforged-logo-primary.svg": "/brand/jobforged-logo-primary-dark.svg",
  "/brand/jobforged-logo-alternate.svg": "/brand/jobforged-logo-alternate-dark.svg",
  "/brand/jobforged-symbol.svg": "/brand/jobforged-symbol-dark.svg",
  "/brand/jobforged-icon-alternate.svg": "/brand/jobforged-icon-alternate-dark.svg",
  "/brand/jobforged-loader.svg": "/brand/jobforged-loader-dark.svg",
  "/brand/jobforged-loader-alternate.svg": "/brand/jobforged-loader-alternate-dark.svg",
  "/brand/jobforged-loader-rotating.svg": "/brand/jobforged-loader-rotating-dark.svg",
  "/brand/jobforged-loader-rotating-alternate.svg": "/brand/jobforged-loader-rotating-alternate-dark.svg",
};

type BrandAssetProps = Omit<ImageProps, "src" | "alt"> & { src: string; alt?: string };

export function BrandAsset({ src, className = "", alt = "", width, height, ...props }: BrandAssetProps) {
  const darkSrc = darkAssets[src];
  const isLogo = src.includes("jobforged-logo-");
  const size = src.includes("jobforged-loader") ? 100 : 46;
  const dimensions = { width: width ?? (isLogo ? 159 : size), height: height ?? (isLogo ? 46 : size) };
  if (!darkSrc) return <Image unoptimized loading={props.fetchPriority === "high" ? "eager" : undefined} {...dimensions} src={src} className={className} alt={alt} {...props} />;

  return (
    <>
      <Image unoptimized loading={props.fetchPriority === "high" ? "eager" : undefined} {...dimensions} src={src} className={`jf-brand-asset jf-brand-asset--light ${className}`.trim()} alt={alt} {...props} />
      <Image unoptimized loading={props.fetchPriority === "high" ? "eager" : undefined} {...dimensions} src={darkSrc} className={`jf-brand-asset jf-brand-asset--dark ${className}`.trim()} alt={alt} {...props} />
    </>
  );
}
