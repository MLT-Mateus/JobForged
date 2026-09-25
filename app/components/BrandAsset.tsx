import type { ImgHTMLAttributes } from "react";

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

type BrandAssetProps = ImgHTMLAttributes<HTMLImageElement> & { src: string };

export function BrandAsset({ src, className = "", alt = "", ...props }: BrandAssetProps) {
  const darkSrc = darkAssets[src];
  if (!darkSrc) return <img src={src} className={className} alt={alt} {...props} />;

  return (
    <>
      <img src={src} className={`jf-brand-asset jf-brand-asset--light ${className}`.trim()} alt={alt} {...props} />
      <img src={darkSrc} className={`jf-brand-asset jf-brand-asset--dark ${className}`.trim()} alt={alt} {...props} />
    </>
  );
}
