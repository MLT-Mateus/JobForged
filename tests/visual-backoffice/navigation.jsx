export const useRouter=()=>({replace:url=>location.assign(url),push:url=>location.assign(url),refresh:()=>location.reload()});
export const usePathname=()=>location.pathname;
export const useSearchParams=()=>new URLSearchParams(location.search);
