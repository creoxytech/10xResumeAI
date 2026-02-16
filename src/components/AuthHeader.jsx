export default function AuthHeader({ email, onLogout }) {
  return (
    <div className="auth-head">
      <div>
        <p className="workspace-kicker">Workspace</p>
        <p className="intro">Signed in as {email}</p>
      </div>
      <button type="button" className="secondary-btn" onClick={onLogout}>
        Log out
      </button>
    </div>
  );
}
