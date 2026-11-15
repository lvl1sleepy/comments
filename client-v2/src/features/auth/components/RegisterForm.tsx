import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";

import { register } from "../api/auth.api";

interface Props {
  onRegistered: () => void;
}

export default function RegisterForm({ onRegistered }: Props) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const registerMutation = useMutation({
    mutationFn: register,
    onSuccess: () => {
      onRegistered();
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    registerMutation.mutate({
      username: username.trim(),
      email: email.trim(),
      password,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create an account</h2>

      <div>
        <label htmlFor="register-username">Username</label>
        <input
          id="register-username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          minLength={3}
          maxLength={50}
          required
        />
      </div>

      <div>
        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="register-password">Password</label>
        <input
          id="register-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>

      <button type="submit" disabled={registerMutation.isPending}>
        {registerMutation.isPending ? "Creating account..." : "Register"}
      </button>

      {registerMutation.isError && (
        <p role="alert">{registerMutation.error.message}</p>
      )}
    </form>
  );
}
