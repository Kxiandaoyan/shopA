import { describe, expect, it } from "vitest";
import { parseEnv } from "@/lib/env";

describe("env validation", () => {
  it("allows local placeholder values outside production", () => {
    const env = parseEnv(
      {
        DATABASE_PROVIDER: "sqlite",
        DATABASE_URL: "file:./dev.db",
        AUTH_SECRET: "replace-me",
        NEXTAUTH_URL: "http://localhost:3000",
        APP_INTERNAL_BASE_URL: "http://localhost:3000",
        INTAKE_TOKEN_SECRET: "replace-me",
        INTAKE_SIGNATURE_SECRET: "",
        STRIPE_SECRET_ENCRYPTION_KEY: "replace-me",
      },
      {
        appEnv: "development",
      },
    );

    expect(env.DATABASE_PROVIDER).toBe("sqlite");
  });

  it("rejects insecure production settings", () => {
    expect(() =>
      parseEnv(
        {
          DATABASE_PROVIDER: "sqlite",
          DATABASE_URL: "file:./dev.db",
          AUTH_SECRET: "replace-me",
          NEXTAUTH_URL: "http://localhost:3000",
          APP_INTERNAL_BASE_URL: "http://localhost:3000",
          INTAKE_TOKEN_SECRET: "replace-me",
          INTAKE_SIGNATURE_SECRET: "",
          STRIPE_SECRET_ENCRYPTION_KEY: "replace-me",
        },
        {
          appEnv: "production",
        },
      ),
    ).toThrow("Invalid production environment configuration");
  });
});
