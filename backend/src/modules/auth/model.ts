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
  // bcrypt hash, never the plain code.
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

export function findUserById(id: number): Promise<User | undefined> {
  return query("Failed to look up user", () =>
    db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst(),
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

export function listValidOtps(now: string): Promise<Otp[]> {
  return query("Failed to look up OTPs", () =>
    db
      .selectFrom("otp")
      .selectAll()
      .where("expires_at", ">", now)
      .execute(),
  );
}

// Returns false when the OTP was already gone, e.g. used by a concurrent login.
export function deleteOtp(id: number): Promise<boolean> {
  return query("Failed to delete OTP", async () => {
    const result = await db
      .deleteFrom("otp")
      .where("id", "=", id)
      .executeTakeFirst();
    return result.numDeletedRows > 0n;
  });
}
