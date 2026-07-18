"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });

    if (result?.error) {
      setError("Email ou senha invalidos.");
      return;
    }

    window.location.assign("/dashboard");
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label htmlFor="email">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="professora@escola.com"
      />

      <label htmlFor="password">Senha</label>
      <input
        id="password"
        name="password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Sua senha"
      />

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" type="submit">
        Entrar no painel
      </button>
    </form>
  );
}
