import { NavLink } from "./nav-link";

const navigation = [
  { href: "/", label: "回归" },
  { href: "/world", label: "世界" },
  { href: "/residents", label: "居民" },
  { href: "/events", label: "事件" },
  { href: "/settings", label: "设置" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="site-header">
        <div className="brand-lockup" aria-label="镜界产品壳">
          <span className="brand-mark" aria-hidden="true">
            ◌
          </span>
          <span>
            <strong>镜界</strong>
            <small>Persistent Digital Society</small>
          </span>
        </div>
        <nav className="primary-nav" aria-label="主要导航">
          {navigation.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>
      </header>

      <main className="main-content">{children}</main>

      <footer className="site-footer">
        <span>M1-T01 · 产品壳</span>
        <span>WORLD · CONTEXT · INSPECT · TEMPORAL · INTELLIGENCE</span>
      </footer>
    </div>
  );
}
