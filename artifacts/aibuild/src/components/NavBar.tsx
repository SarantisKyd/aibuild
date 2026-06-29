import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const [location] = useLocation();

  const links = [
    { href: "/", label: "Home" },
    { href: "/board", label: "Find jobs" },
    { href: "/post", label: "Post a job" },
    { href: "/tools", label: "Tools" },
    { href: "/builder", label: "For builders" },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="flex items-center gap-2" data-testid="link-home-logo">
            <span className="text-xl font-medium">AI<span className="font-bold text-primary">Build</span></span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={`link-nav-${link.label.toLowerCase().replace(" ", "-")}`}
                className={`transition-colors hover:text-foreground/80 ${
                  location === link.href ? "text-foreground" : "text-foreground/60"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center">
            <Link href="/post" data-testid="link-nav-cta">
              <Button>Post a job</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
