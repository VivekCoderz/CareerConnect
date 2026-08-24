import { Briefcase, CheckCircle2, TrendingUp, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <div className="auth-container">
      {/* Left Sidebar - Desktop only */}
      <div className="auth-sidebar animate-slide-left">
        {/* Brand Header */}
        <Link to="/" className="auth-brand">
          <div className="brand-icon-wrapper">
            <Briefcase size={22} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span>CareerConnect</span>
        </Link>

        {/* Hero content */}
        <div className="auth-hero-content">
          <h1 className="auth-hero-title">Your next opportunity starts here.</h1>
          <p className="auth-hero-text">
            Discover thousands of curated job and internship opportunities, connect with top-tier recruiters, and take the next step in your professional journey.
          </p>

          <div className="auth-features-list">
            <div className="auth-feature-item">
              <div className="auth-feature-bullet">
                <CheckCircle2 size={15} color="#ffffff" />
              </div>
              <span>Vetted roles from high-growth startups & top enterprises</span>
            </div>
            
            <div className="auth-feature-item">
              <div className="auth-feature-bullet">
                <TrendingUp size={15} color="#ffffff" />
              </div>
              <span>Personalized recommendations matching your skills</span>
            </div>

            <div className="auth-feature-item">
              <div className="auth-feature-bullet">
                <ShieldCheck size={15} color="#ffffff" />
              </div>
              <span>Verified credentials that catch recruiters' attention</span>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="auth-sidebar-footer">
          <p>© 2026 CareerConnect Inc. Made for students, professionals & employers.</p>
        </div>
      </div>

      {/* Right form container side */}
      <div className="auth-form-side">
        <div className="auth-card animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
