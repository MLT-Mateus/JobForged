import originalLoader from "../../public/brand/jobforged-loader.svg?raw";

// Embed the approved SVG itself: first paint needs no image request or client JS.
export function InlineBrandLoader() {
  return <span className="app-loader__logo app-loader__inline" aria-hidden="true" dangerouslySetInnerHTML={{__html: originalLoader}}/>;
}
