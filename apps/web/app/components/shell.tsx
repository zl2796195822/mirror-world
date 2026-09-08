import { NavLink } from "./nav-link";
import { signOut } from "../actions/auth";
import { getCurrentUser } from "../../lib/auth/session";

const navigation = [
  { href: "/", label: "回归" },
  { href: "/world", label: "世界" },
  { href: "/residents", label: "居民" },
  { href: "/events", label: "事件" },
  { href: "/settings", label: "设置" },
];

export async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

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
        {user ? (
          <>
            <nav className="primary-nav" aria-label="主要导航">
              {navigation.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
            <div className="identity-controls">
              <span className="identity-pill">
                <span className="identity-pill__label">开发身份</span>
                <span>{user.email}</span>
              </span>
              <form action={signOut}>
                <button className="signout-button" type="submit">
                  退出
                </button>
              </form>
            </div>
          </>
        ) : (
          <span className="identity-state">身份未建立</span>
        )}
      </header>

      <main className="main-content">{children}</main>

      <footer className="site-footer">
        <span>M1-T03 · WORLD OVERVIEW</span>
        <span>WORLD · CONTEXT · INSPECT · TEMPORAL · INTELLIGENCE</span>
      </footer>
    </div>
  );
}
