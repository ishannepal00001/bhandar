// auth: db tables and queries
import type { Generated, Insertable, Selectable } from "kysely";
import { db } from "../../db";

export class AuthModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthModelError";
  }
}

export interface UsersTable {
  id: Generated<number>;
  name: string;
  email: string;
  // Bun.password hash, never the plain password.
  password: string;
  created_at: Generated<string>;
}

export interface OtpTable {
  id: Generated<number>;
  user_id: number;
  code: string;
  expires_at: string;
  created_at: Generated<string>;
}

export type User = Selectable<UsersTable>;
export type Otp = Selectable<OtpTable>;

async function query<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    throw new AuthModelError(message, { cause: err });
  }
}

export function listUsers(): Promise<User[]> {
  return query("Failed to list users", () =>
    db.selectFrom("users").selectAll().execute(),
  );
}

export function upsertUser(user: Insertable<UsersTable>): Promise<void> {
  return query("Failed to save user", async () => {
    await db
      .insertInto("users")
      .values(user)
      .onConflict((oc) =>
        oc
          .column("name")
          .doUpdateSet({ email: user.email, password: user.password }),
      )
      .execute();
  });
}

export function createOtp(otp: Insertable<OtpTable>): Promise<void> {
  return query("Failed to save OTP", async () => {
    await db.insertInto("otp").values(otp).execute();
  });
}

export function findValidOtp(
  code: string,
  now: string,
): Promise<Otp | undefined> {
  return query("Failed to look up OTP", () =>
    db
      .selectFrom("otp")
      .selectAll()
      .where("code", "=", code)
      .where("expires_at", ">", now)
      .executeTakeFirst(),
  );
}
