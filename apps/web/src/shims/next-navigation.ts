import {
  useLocation,
  useNavigate,
  useParams as useRouteParams,
} from "react-router-dom";

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    prefetch: async () => undefined,
  };
}

export function usePathname() {
  return useLocation().pathname;
}

export function useSearchParams() {
  const { search } = useLocation();
  return new URLSearchParams(search);
}

export function useParams<T extends Record<string, string | undefined>>() {
  return useRouteParams() as T;
}

export function redirect(href: string): never {
  if (typeof window !== "undefined") {
    window.location.replace(href);
  }
  throw new Error(`Redirecting to ${href}`);
}
