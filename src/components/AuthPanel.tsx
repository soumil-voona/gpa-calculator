import { GraduationCap } from "lucide-react";
import { FormEvent, useState } from "react";
import { lastCompletedOptions } from "../lib/academics";
import type { LastCompletedSemester } from "../types";

export function AuthPanel({
  onSignup,
  onLogin,
}: {
  onSignup: (email: string, password: string, graduationYear: number, lastCompletedSemester: LastCompletedSemester) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<unknown>;
}) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [graduationYear, setGraduationYear] = useState(new Date().getFullYear() + 2);
  const [lastCompletedSemester, setLastCompletedSemester] = useState<LastCompletedSemester>("8-before");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "signup") await onSignup(email, password, graduationYear, lastCompletedSemester);
      else await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-panel">
        <div className="brand-mark">
          <GraduationCap size={32} />
        </div>
        <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
        <p>
          {mode === "signup" 
            ? "Start tracking your academic progress and planning for graduation with our interactive GPA calculator."
            : "Log in to access your saved coursework and continue planning your academic journey."}
        </p>
        
        <form onSubmit={handleSubmit}>
          <label>
            Email Address
            <input 
              type="email" 
              placeholder="name@example.com"
              value={email} 
              onChange={(event) => setEmail(event.target.value)} 
              required 
            />
          </label>
          <label>
            Password
            <input 
              type="password" 
              placeholder="••••••••"
              minLength={6} 
              value={password} 
              onChange={(event) => setPassword(event.target.value)} 
              required 
            />
          </label>
          
          {mode === "signup" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <label>
                Graduation Year
                <input 
                  type="number" 
                  value={graduationYear} 
                  onChange={(event) => setGraduationYear(Number(event.target.value))} 
                  required 
                />
              </label>
              <label>
                Last Completed
                <select value={lastCompletedSemester} onChange={(event) => setLastCompletedSemester(event.target.value as LastCompletedSemester)}>
                  {lastCompletedOptions.map((option) => (
                    <option value={option.value} key={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          
          {error && <p className="error" style={{ marginTop: 8 }}>{error}</p>}
          
          <button className="button" disabled={busy} type="submit" style={{ marginTop: 8 }}>
            {busy ? "Processing..." : mode === "signup" ? "Get Started" : "Sign In"}
          </button>
        </form>
        
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button className="link-button" onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); }}>
            {mode === "signup" ? "Already have an account? Sign in" : "Don't have an account? Create one"}
          </button>
        </div>
      </section>
    </main>
  );
}
