import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Link as RouterLink } from "react-router-dom";

type LinkProps = Omit<ComponentPropsWithoutRef<"a">, "href"> & {
  href: string;
};

const ABSOLUTE_URL = /^(https?:)?\/\//i;

const NextLinkShim = forwardRef<HTMLAnchorElement, LinkProps>(
  function NextLinkShim({ href, children, ...props }, ref) {
    const isExternal =
      ABSOLUTE_URL.test(href) ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:");

    if (isExternal) {
      return (
        <a href={href} ref={ref} {...props}>
          {children}
        </a>
      );
    }

    return (
      <RouterLink ref={ref} to={href} {...props}>
        {children}
      </RouterLink>
    );
  },
);

export default NextLinkShim;
