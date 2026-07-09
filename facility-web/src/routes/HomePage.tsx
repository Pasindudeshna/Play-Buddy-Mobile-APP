import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div>
      <div className="page-header">
        <h2>Welcome back</h2>
        <p>Manage your grounds and listings from here.</p>
      </div>
      <div className="home-grid">
        <Link className="home-card" to="/dashboard">
          <span className="home-card-icon">🏟️</span>
          <span className="home-card-title">My Grounds</span>
          <span className="home-card-desc">View and manage the grounds you've registered</span>
        </Link>
      </div>
    </div>
  );
}
