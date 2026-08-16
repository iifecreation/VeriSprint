import Link from "next/link";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dev", label: "Developer View" },
  { href: "/chat", label: "Repo Chat" },
  { href: "/standup", label: "Standups" },
  { href: "/sprints", label: "Sprints" },
  { href: "/reports", label: "Reports" },
  { href: "/orphan-commits", label: "Orphan Commits" },
  { href: "/accuracy", label: "Accuracy" },
  { href: "/roi", label: "ROI" },
  { href: "/audit", label: "Audit Log" },
  { href: "/settings", label: "Settings" },
];

export function TopNav() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <Link href="/" className="font-semibold text-gray-900">
          VeriSprint
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-gray-900">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
