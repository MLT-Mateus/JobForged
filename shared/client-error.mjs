/** Never return or log raw messages, URLs, form values or credentials. */
export function clientFailureKind(error){
 const message=error instanceof Error?error.message:'';
 return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message)?'outdated-assets':'render-failed';
}
