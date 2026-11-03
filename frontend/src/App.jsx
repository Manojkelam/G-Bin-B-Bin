
import { useState } from "react";
import { supabase } from "./lib/supabaseClient";
import Shop from "./Shop";
import "./App.css";

const initialProfile = {
  fullName: "User",
  email: "",
  phone: "",
  address: "",
  area: "",
  familyMembers: 1,
  householdCode: "",
  gBinStatus: "pending",
  bBinStatus: "pending",
};

function App() {
  const [page, setPage] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState(initialProfile);

  // ================= LOAD USER PROFILE =================
  const loadProfile = async (user) => {
    const [profileResult, householdResult] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "full_name, phone, email, address, area, family_members"
        )
        .eq("id", user.id)
        .maybeSingle(),

      supabase
        .from("households")
        .select("household_code, g_bin_status, b_bin_status")
        .eq("owner_id", user.id)
        .maybeSingle(),
    ]);

    if (profileResult.error) {
      alert("Could not load profile: " + profileResult.error.message);
      return;
    }

    if (householdResult.error) {
      alert("Could not load household: " + householdResult.error.message);
      return;
    }

    const p = profileResult.data || {};
    const h = householdResult.data || {};

    setProfile({
      fullName: p.full_name || user.user_metadata?.full_name || "User",
      email: p.email || user.email || "",
      phone: p.phone || user.user_metadata?.phone || "",
      address: p.address || "",
      area: p.area || "",
      familyMembers: p.family_members || 1,
      householdCode: h.household_code || "",
      gBinStatus: h.g_bin_status || "pending",
      bBinStatus: h.b_bin_status || "pending",
    });

    setPage("dashboard");
  };

  // ================= USER REGISTRATION =================
  const handleRegister = async (e) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);

    const fullName = String(form.get("full_name") || "").trim();
    const phone = String(form.get("phone") || "").trim();
    const email = String(form.get("email") || "").trim();
    const area = String(form.get("area") || "").trim();
    const address = String(form.get("address") || "").trim();
    const familyMembers = Number(form.get("family_members"));
    const password = String(form.get("password") || "");
    const confirmPassword = String(
      form.get("confirm_password") || ""
    );

    if (!fullName || !phone || !email || !area || !address) {
      alert("Please complete all required fields.");
      return;
    }

    if (!Number.isInteger(familyMembers) || familyMembers < 1) {
      alert("Enter a valid number of family members.");
      return;
    }

    if (password.length < 8) {
      alert("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone,
            address,
            area,
            family_members: familyMembers,
          },
        },
      });

      if (error) {
        alert("Registration failed: " + error.message);
        return;
      }

      if (data.session && data.user) {
        await loadProfile(data.user);

        alert("Your account has been created successfully!");
      } else {
        alert(
          "Registration submitted. Please check your email for the confirmation link, then log in."
        );

        setPage("user-login");
      }
    } catch (error) {
      alert(error.message || "Registration failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= USER LOGIN =================
  const handleLogin = async (e) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password) {
      alert("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        alert("Login failed: " + error.message);
        return;
      }

      if (data.user) {
        await loadProfile(data.user);
      }
    } catch (error) {
      alert(error.message || "Unable to log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= FORGOT PASSWORD =================
  const handleForgotPassword = async (e) => {
    e.preventDefault();

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();

    if (!email) {
      alert("Enter your registered email address.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) {
        alert("Could not request reset: " + error.message);
        return;
      }

      alert(
        "If the account is eligible, a password-reset email will be sent."
      );

      setPage("user-login");
    } catch (error) {
      alert(error.message || "Password reset failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ================= LOGOUT =================
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Logout failed: " + error.message);
      return;
    }

    setProfile(initialProfile);
    setPage("home");
  };

  // ================= HOME PAGE =================
  if (page === "home") {
    return (
      <div className="page">
        <div className="auth-shell">
          <section className="brand-section">
            <div className="brand-logo">GB</div>

            <div className="brand-title">G-Bin &amp; B-Bin</div>

            <p className="brand-subtitle">
              Smart Waste Segregation and Management System
            </p>

            <p className="brand-description">
              A smarter way to segregate waste and build cleaner communities.
            </p>
          </section>

          <section className="role-section">
            <span className="eyebrow">WELCOME</span>

            <h2>Get started</h2>

            <p className="role-text">
              Choose your portal to continue.
            </p>

            <div className="role-cards">
              <button
                className="role-card"
                onClick={() => setPage("user-login")}
              >
                <div className="role-icon">👤</div>

                <div className="role-content">
                  <h3>User Portal</h3>
                  <p>
                    Access your household dashboard and account.
                  </p>
                </div>

                <span className="arrow">→</span>
              </button>

              <button
                className="role-card"
                onClick={() => setPage("admin-login")}
              >
                <div className="role-icon">🛡️</div>

                <div className="role-content">
                  <h3>Admin Portal</h3>
                  <p>
                    Manage households and platform information.
                  </p>
                </div>

                <span className="arrow">→</span>
              </button>
            </div>

            <p className="security-note">
              🌱 Better segregation. A cleaner tomorrow.
            </p>
          </section>
        </div>
      </div>
    );
  }

  // ================= USER LOGIN =================
  if (page === "user-login") {
    return (
      <div className="page">
        <div className="login-layout">
          <section className="login-brand-panel">
            <button
              className="back-link"
              onClick={() => setPage("home")}
            >
              ← Back to Home
            </button>

            <div className="large-logo">GB</div>

            <h1>G-Bin &amp; B-Bin</h1>

            <p>
              Smart Waste Segregation
              <br />
              &amp; Management System
            </p>

            <div className="eco-card">
              ♻
              <span>
                Segregate today. Build a cleaner tomorrow.
              </span>
            </div>
          </section>

          <section className="login-form-panel">
            <span className="form-badge">USER PORTAL</span>

            <h2>Welcome Back</h2>

            <p className="form-intro">
              Sign in to your household account.
            </p>

            <form onSubmit={handleLogin}>
              <label>Email Address</label>

              <input
                type="email"
                name="email"
                placeholder="Enter your email"
                autoComplete="email"
                required
              />

              <label>Password</label>

              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <button
                type="button"
                className="forgot-link"
                onClick={() => setPage("forgot")}
              >
                Forgot password?
              </button>

              <button
                className="primary-btn"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Signing in..." : "Login →"}
              </button>
            </form>

            <p className="form-footer">
              New to G-Bin &amp; B-Bin?{" "}
              <button onClick={() => setPage("register")}>
                Create account
              </button>
            </p>
          </section>
        </div>
      </div>
    );
  }

  // ================= ADMIN PORTAL =================
  if (page === "admin-login") {
    return (
      <div className="page">
        <div className="simple-card">
          <button
            className="back-link"
            onClick={() => setPage("home")}
          >
            ← Back to Home
          </button>

          <div className="large-logo">GB</div>

          <span className="form-badge">ADMIN PORTAL</span>

          <h2>Admin access</h2>

          <p className="form-intro">
            Secure administrator authentication will be configured separately.
            Public user registration does not grant admin privileges.
          </p>

          <button
            className="primary-btn"
            onClick={() => setPage("home")}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ================= REGISTRATION PAGE =================
  if (page === "register") {
    return (
      <div className="page">
        <div className="register-layout">
          <button
            className="back-link"
            onClick={() => setPage("user-login")}
          >
            ← Back to Login
          </button>

          <div className="small-logo">GB</div>

          <span className="form-badge">USER REGISTRATION</span>

          <h2>Create your account</h2>

          <p className="form-intro">
            Register your household with G-Bin &amp; B-Bin.
          </p>

          <form
            className="register-grid"
            onSubmit={handleRegister}
          >
            <div className="form-group">
              <label>Full Name</label>

              <input
                name="full_name"
                placeholder="Full name"
                autoComplete="name"
                required
              />
            </div>

            <div className="form-group">
              <label>Mobile Number</label>

              <input
                name="phone"
                type="tel"
                placeholder="Mobile number"
                autoComplete="tel"
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>

              <input
                name="email"
                type="email"
                placeholder="Email address"
                autoComplete="email"
                required
              />
            </div>

            <div className="form-group">
              <label>Area / City</label>

              <input
                name="area"
                placeholder="Area or city"
                required
              />
            </div>

            <div className="form-group full-width">
              <label>Full Address</label>

              <textarea
                name="address"
                rows="3"
                placeholder="Full address"
                autoComplete="street-address"
                required
              />
            </div>

            <div className="form-group">
              <label>Family Members</label>

              <input
                name="family_members"
                type="number"
                min="1"
                max="100"
                defaultValue="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                name="password"
                type="password"
                minLength={8}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm Password</label>

              <input
                name="confirm_password"
                type="password"
                minLength={8}
                placeholder="Confirm password"
                autoComplete="new-password"
                required
              />
            </div>

            <button
              className="primary-btn full-width"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create Account →"}
            </button>
          </form>

          <p className="note">
            Email confirmation may be required. Real mobile OTP and Aadhaar
            verification are not enabled yet.
          </p>
        </div>
      </div>
    );
  }

  // ================= FORGOT PASSWORD =================
  if (page === "forgot") {
    return (
      <div className="page">
        <div className="simple-card">
          <button
            className="back-link"
            onClick={() => setPage("user-login")}
          >
            ← Back to Login
          </button>

          <div className="large-logo">GB</div>

          <span className="form-badge">ACCOUNT RECOVERY</span>

          <h2>Reset your password</h2>

          <p className="form-intro">
            Enter your registered email to request a reset link.
          </p>

          <form onSubmit={handleForgotPassword}>
            <label>Email Address</label>

            <input
              name="email"
              type="email"
              placeholder="Registered email"
              required
            />

            <button
              className="primary-btn"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Sending..." : "Send Reset Link →"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ================= USER DASHBOARD =================
  if (
    page === "dashboard" ||
    page === "guide" ||
    page === "shop" ||
    page === "reports" ||
    page === "account"
  ) {
    const navItems = [
      { id: "dashboard", icon: "⌂", label: "Dashboard" },
      { id: "guide", icon: "♻", label: "Segregation Guide" },
      { id: "shop", icon: "▣", label: "G-Bin & B-Bin Shop" },
      { id: "reports", icon: "▥", label: "Reports" },
      { id: "account", icon: "◉", label: "My Account" },
    ];

    const activeNav = navItems.find((item) => item.id === page);
    const nameInitial = profile.fullName.charAt(0).toUpperCase();

    const binStatusLabel = (status) => {
      if (status === "distributed") return "Distributed";
      if (status === "damaged") return "Needs attention";
      return "Pending distribution";
    };

    return (
      <div className="dashboard-layout">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-logo">GB</div>

            <div>
              <strong>G-Bin &amp; B-Bin</strong>
              <span>SMART WASTE SYSTEM</span>
            </div>
          </div>

          <div className="sidebar-caption">WORKSPACE</div>

          <nav className="sidebar-nav">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={
                  page === item.id
                    ? "nav-item active"
                    : "nav-item"
                }
                onClick={() => setPage(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                {page === item.id && (
                  <span className="nav-indicator" />
                )}
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-tip">
              <span>🌱</span>
              <strong>Small change, big impact</strong>
              <p>
                Separate waste at the source to support recovery.
              </p>
            </div>

            <button className="logout-btn" onClick={handleLogout}>
              ↪ Log out
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          <header className="topbar">
            <div>
              <div className="breadcrumb">
                Workspace / {activeNav?.label}
              </div>

              <h1>
                {page === "dashboard" && "Your Dashboard"}
                {page === "guide" && "Waste Segregation Guide"}
                {page === "shop" && "G-Bin & B-Bin Shop"}
                {page === "reports" && "Reports & Impact"}
                {page === "account" && "My Account"}
              </h1>
            </div>

            <div className="topbar-user">
              <div className="user-avatar">{nameInitial}</div>

              <div>
                <strong>{profile.fullName}</strong>
                <span>Household member</span>
              </div>
            </div>
          </header>

          <div className="dashboard-content">
            {/* MAIN DASHBOARD */}
            {page === "dashboard" && (
              <>
                <section className="welcome-banner">
                  <div className="welcome-copy">
                    <span className="banner-tag">
                      YOUR GREEN JOURNEY
                    </span>

                    <h2>
                      Hello, {profile.fullName.split(" ")[0]}! 🌿
                    </h2>

                    <p>
                      Better waste segregation starts at home. Keep wet
                      waste and dry recyclable waste separate for proper
                      processing.
                    </p>

                    <button
                      className="banner-btn"
                      onClick={() => setPage("guide")}
                    >
                      Explore segregation guide →
                    </button>
                  </div>

                  <div className="banner-art" aria-hidden="true">
                    <div className="art-circle">
                      <span>♻</span>
                    </div>

                    <div className="art-leaf leaf-one">🌿</div>
                    <div className="art-leaf leaf-two">🍃</div>
                  </div>
                </section>

                <div className="section-heading">
                  <div>
                    <h2>Household overview</h2>
                    <p>Your registered household information.</p>
                  </div>

                  <button
                    className="text-btn"
                    onClick={() => setPage("account")}
                  >
                    View account →
                  </button>
                </div>

                <section className="overview-grid">
                  <article className="overview-card household-overview">
                    <div className="overview-icon">⌂</div>
                    <span className="card-label">HOUSEHOLD ID</span>

                    <h3>
                      {profile.householdCode || "Not assigned"}
                    </h3>

                    <p>Your unique household code</p>
                  </article>

                  <article className="overview-card">
                    <div className="overview-icon green-icon">♧</div>
                    <span className="card-label">GREEN BIN</span>

                    <h3>{binStatusLabel(profile.gBinStatus)}</h3>

                    <p>Biodegradable waste</p>
                  </article>

                  <article className="overview-card">
                    <div className="overview-icon blue-icon">♧</div>
                    <span className="card-label">BLUE BIN</span>

                    <h3>{binStatusLabel(profile.bBinStatus)}</h3>

                    <p>Dry recyclable waste</p>
                  </article>
                </section>

                <div className="section-heading">
                  <div>
                    <h2>Know your bins</h2>
                    <p>
                      Use the right bin to support waste recovery.
                    </p>
                  </div>

                  <button
                    className="text-btn"
                    onClick={() => setPage("guide")}
                  >
                    Full guide →
                  </button>
                </div>

                <section className="bin-grid">
                  <article className="bin-card green-bin-card">
                    <div className="bin-illustration green-bin-illustration">
                      <div className="bin-lid" />
                      <div className="bin-body">G</div>
                    </div>

                    <div className="bin-details">
                      <span className="bin-label">
                        BIODEGRADABLE
                      </span>

                      <h3>G-Bin</h3>

                      <p>
                        Suitable fruit and vegetable peels, food scraps,
                        and other accepted organic waste.
                      </p>

                      <button onClick={() => setPage("guide")}>
                        What goes inside? →
                      </button>
                    </div>
                  </article>

                  <article className="bin-card blue-bin-card">
                    <div className="bin-illustration blue-bin-illustration">
                      <div className="bin-lid" />
                      <div className="bin-body">B</div>
                    </div>

                    <div className="bin-details">
                      <span className="bin-label">
                        DRY RECYCLABLES
                      </span>

                      <h3>B-Bin</h3>

                      <p>
                        Clean paper, accepted plastic packaging, metal cans,
                        and other accepted recyclables.
                      </p>

                      <button onClick={() => setPage("guide")}>
                        What goes inside? →
                      </button>
                    </div>
                  </article>
                </section>

                <div className="regular-collection-note">
                  <span>🚛</span>
                  <p>
                    <strong>Regular household collection</strong>
                    <br />
                    Collection follows your local service schedule. No
                    separate user request is needed.
                  </p>
                </div>

                <section className="bottom-shortcuts">
                  <button onClick={() => setPage("shop")}>
                    <span>🛍️</span>

                    <div>
                      <strong>Explore the shop</strong>
                      <small>View our bins and combo options</small>
                    </div>

                    <span className="shortcut-arrow">→</span>
                  </button>

                  <button onClick={() => setPage("reports")}>
                    <span>📊</span>

                    <div>
                      <strong>Reports &amp; impact</strong>
                      <small>View available platform information</small>
                    </div>

                    <span className="shortcut-arrow">→</span>
                  </button>
                </section>
              </>
            )}

            {/* SEGREGATION GUIDE */}
            {page === "guide" && (
              <section className="content-panel">
                <div className="panel-heading">
                  <span className="eyebrow">
                    SEGREGATE AT SOURCE
                  </span>

                  <h2>Know what goes into each bin</h2>

                  <p>
                    Local collection rules may vary. Follow instructions
                    from your local waste collection service.
                  </p>
                </div>

                <div className="guide-grid">
                  <article className="guide-card green-guide">
                    <div className="guide-icon">🌿</div>

                    <h3>G-Bin — Biodegradable</h3>

                    <p className="guide-subtitle">
                      Suitable organic waste
                    </p>

                    <ul>
                      <li>Fruit and vegetable peels</li>
                      <li>Suitable food scraps</li>
                      <li>Tea leaves and coffee grounds</li>
                      <li>Other locally accepted organic waste</li>
                    </ul>

                    <div className="guide-tip">
                      Keep unsuitable packaging out of organic waste.
                    </div>
                  </article>

                  <article className="guide-card blue-guide">
                    <div className="guide-icon">♻️</div>

                    <h3>B-Bin — Dry recyclables</h3>

                    <p className="guide-subtitle">
                      Clean and accepted materials
                    </p>

                    <ul>
                      <li>Clean paper and cardboard</li>
                      <li>Accepted plastic containers</li>
                      <li>Metal cans and containers</li>
                      <li>Other locally accepted recyclables</li>
                    </ul>

                    <div className="guide-tip">
                      Keep recyclable items dry and reasonably clean.
                    </div>
                  </article>
                </div>

                <div className="warning-note">
                  <strong>Special waste needs separate handling.</strong>

                  <p>
                    Batteries, e-waste, sanitary waste, and household
                    hazardous waste should not be put into these two bins.
                    Follow local authority disposal instructions.
                  </p>
                </div>
              </section>
            )}

            {/* SHOP */}
            {page === "shop" && <Shop />}

            {/* REPORTS */}
            {page === "reports" && (
              <section className="content-panel">
                <div className="panel-heading">
                  <span className="eyebrow">REPORTS</span>

                  <h2>Environmental impact</h2>

                  <p>
                    Verified results will appear as collection and processing
                    data becomes available.
                  </p>
                </div>

                <div className="empty-report">
                  <div>📊</div>

                  <h3>No verified impact data yet</h3>

                  <p>
                    Environmental totals will appear after authorised
                    collection and processing records are entered. This
                    dashboard will not invent figures.
                  </p>
                </div>
              </section>
            )}

            {/* ACCOUNT */}
            {page === "account" && (
              <section className="content-panel">
                <div className="panel-heading">
                  <span className="eyebrow">YOUR ACCOUNT</span>

                  <h2>Household profile</h2>

                  <p>
                    Review your registered contact and household details.
                  </p>
                </div>

                <div className="account-grid">
                  <div className="account-field">
                    <span>Full Name</span>
                    <strong>{profile.fullName || "—"}</strong>
                  </div>

                  <div className="account-field">
                    <span>Email Address</span>
                    <strong>{profile.email || "—"}</strong>
                  </div>

                  <div className="account-field">
                    <span>Mobile Number</span>
                    <strong>{profile.phone || "—"}</strong>
                  </div>

                  <div className="account-field">
                    <span>Household ID</span>
                    <strong>
                      {profile.householdCode || "Not assigned"}
                    </strong>
                  </div>

                  <div className="account-field">
                    <span>Area / City</span>
                    <strong>{profile.area || "—"}</strong>
                  </div>

                  <div className="account-field">
                    <span>Family Members</span>
                    <strong>{profile.familyMembers}</strong>
                  </div>

                  <div className="account-field full-width">
                    <span>Address</span>
                    <strong>{profile.address || "—"}</strong>
                  </div>
                </div>

                <p className="note">
                  Profile editing will be added after the secure account
                  update flow is implemented.
                </p>
              </section>
            )}

            <footer className="dashboard-footer">
              G-Bin &amp; B-Bin · Smart Waste Segregation and Management System
            </footer>
          </div>
        </main>
      </div>
    );
  }

  return null;
}

export default App;
