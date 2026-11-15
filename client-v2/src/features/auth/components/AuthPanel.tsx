import { useState } from "react";

import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

type AuthMode = "login" | "register";

export default function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [registrationSuccessful, setRegistrationSuccessful] = useState(false);

  function handleRegistered() {
    setRegistrationSuccessful(true);
    setMode("login");
  }

  function toggleMode() {
    setMode((current) => (current === "login" ? "register" : "login"));

    setRegistrationSuccessful(false);
  }

  return (
    <section>
      {registrationSuccessful && (
        <p role="status">Account created successfully. Please log in.</p>
      )}

      {mode === "login" ? (
        <LoginForm />
      ) : (
        <RegisterForm onRegistered={handleRegistered} />
      )}

      <button type="button" onClick={toggleMode}>
        {mode === "login"
          ? "Don't have an account? Register"
          : "Already have an account? Log in"}
      </button>
    </section>
  );
}
