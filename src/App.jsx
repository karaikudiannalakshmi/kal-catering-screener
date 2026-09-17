import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import ScreenerForm from "./pages/ScreenerForm.jsx";
import ReviewDashboard from "./pages/ReviewDashboard.jsx";
import OrderDetail from "./pages/OrderDetail.jsx";
import ManageTemplates from "./pages/ManageTemplates.jsx";
import ManageContractors from "./pages/ManageContractors.jsx";
import Submissions from "./pages/Submissions.jsx";
import ManageRecipes from "./pages/ManageRecipes.jsx";
import BillPage from "./pages/BillPage.jsx";
import CustomerRequestForm from "./pages/CustomerRequestForm.jsx";
import Login from "./pages/Login.jsx";
import ManageStaff from "./pages/ManageStaff.jsx";
import Reports from "./pages/Reports.jsx";
import { useAuth } from "./lib/useAuth.js";

function StaffLayout({ user, signOut }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark">KAL Catering</span>
          <span className="sub">Order Screener</span>
        </div>
        <nav>
          <NavLink to="/screener" className={({ isActive }) => (isActive ? "active" : "")}>
            Take order
          </NavLink>
          <NavLink to="/review" className={({ isActive }) => (isActive ? "active" : "")}>
            Review
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => (isActive ? "active" : "")}>
            Reports
          </NavLink>
          <NavLink to="/submissions" className={({ isActive }) => (isActive ? "active" : "")}>
            Customer submissions
          </NavLink>
          <NavLink to="/templates" className={({ isActive }) => (isActive ? "active" : "")}>
            Menu templates
          </NavLink>
          <NavLink to="/recipes" className={({ isActive }) => (isActive ? "active" : "")}>
            Recipes
          </NavLink>
          <NavLink to="/contractors" className={({ isActive }) => (isActive ? "active" : "")}>
            Contractors
          </NavLink>
          <NavLink to="/staff" className={({ isActive }) => (isActive ? "active" : "")}>
            Staff
          </NavLink>
        </nav>
        <button className="btn-secondary" onClick={signOut} style={{ marginLeft: 12 }}>
          Sign out ({user.email})
        </button>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/screener" replace />} />
          <Route path="/screener" element={<ScreenerForm />} />
          <Route path="/review" element={<ReviewDashboard />} />
          <Route path="/review/:orderId" element={<OrderDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/submissions" element={<Submissions />} />
          <Route path="/templates" element={<ManageTemplates />} />
          <Route path="/recipes" element={<ManageRecipes />} />
          <Route path="/contractors" element={<ManageContractors />} />
          <Route path="/staff" element={<ManageStaff />} />
        </Routes>
      </main>
    </div>
  );
}

function StaffArea() {
  const { user, staff, loading, signOut } = useAuth();

  if (loading) {
    return <div className="loading-state">Loading…</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!staff?.approved) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <h2 style={{ marginBottom: 10 }}>Waiting for approval</h2>
          <p style={{ color: "var(--ink-soft)", marginBottom: 16 }}>
            You're signed in as {user.email}, but another staff member hasn't approved your account yet.
            Ask them to do it under the "Staff" tab.
          </p>
          <button className="btn-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return <StaffLayout user={user} signOut={signOut} />;
}

function BillRoute() {
  const { user, staff, loading } = useAuth();

  if (loading) return <div className="loading-state">Loading…</div>;
  if (!user) return <Login />;
  if (!staff?.approved) {
    return (
      <div style={{ minHeight: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <h2 style={{ marginBottom: 10 }}>Waiting for approval</h2>
          <p style={{ color: "var(--ink-soft)" }}>
            You're signed in as {user.email}, but another staff member hasn't approved your account yet.
          </p>
        </div>
      </div>
    );
  }
  return <BillPage />;
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Customer-facing — public, no login, no staff tools visible */}
        <Route path="/request" element={<CustomerRequestForm />} />
        {/* Standalone (no topbar) so it prints cleanly — still requires an approved staff login */}
        <Route path="/bill/:orderId" element={<BillRoute />} />
        <Route path="/*" element={<StaffArea />} />
      </Routes>
    </HashRouter>
  );
}
