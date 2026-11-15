import { Link, Outlet } from "react-router";
import { useAuth } from "../features/auth/auth-context";
import styles from "./AppLayout.module.css";

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <nav aria-label="Main navigation">
            <Link to="/" className={styles.brand}>
              Comments Platform
            </Link>
          </nav>

          {user && (
            <span className={styles.user}>Logged in as {user.username}</span>
          )}
        </div>
      </header>

      <div className={styles.content}>
        <Outlet />
      </div>

      <footer className={styles.footer}>Comments Platform</footer>
    </div>
  );
}
