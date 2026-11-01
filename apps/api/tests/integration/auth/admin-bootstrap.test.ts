import { afterAll, afterEach, describe, expect, it } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { db, pool, users } from "@/db";
import { bootstrapFirstAdmin, hashPasswordWithM1 } from "@/services/user.service";
import * as userRepository from "@/repositories/user.repository";
import { UserRole } from "@/types";

const testEmailPrefix = `admin-bootstrap-${crypto.randomUUID()}@lurnkode.test`;
const createdEmails: string[] = [];
const password = "Local-test-admin-Passphrase-42!";

function email(suffix: string): string {
  const value = `${testEmailPrefix.split("@")[0]}-${suffix}@lurnkode.test`;
  createdEmails.push(value);
  return value;
}

async function insertExistingAdmin(status: "active" | "locked"): Promise<string> {
  const emailAddress = email(`existing-${status}`);
  const row = await userRepository.insert({
    email: emailAddress,
    fullName: "Existing test administrator",
    passwordHash: await hashPasswordWithM1(password),
    role: UserRole.Admin,
    status,
  });
  return row.id;
}

afterEach(async () => {
  if (createdEmails.length > 0) {
    await db.delete(users).where(inArray(users.email, createdEmails.splice(0)));
  }
});

afterAll(async () => {
  await pool.end();
});

describe("M1 one-time first Admin bootstrap", () => {
  it("creates an active first Admin when no Admin account exists", async () => {
    const emailAddress = email("success");
    const user = await bootstrapFirstAdmin({ email: emailAddress, fullName: "First Admin", password });

    expect(user.role).toBe(UserRole.Admin);
    const stored = await userRepository.findByLoginIdentifier(emailAddress);
    expect(stored?.status).toBe("active");
    expect(stored?.passwordHash.startsWith("$argon2id$")).toBe(true);
    expect(await Bun.password.verify(password, stored!.passwordHash)).toBe(true);
  });

  it("rejects bootstrap when an active Admin exists", async () => {
    await insertExistingAdmin("active");
    await expect(bootstrapFirstAdmin({ email: email("second-active"), fullName: "Second Admin", password }))
      .rejects.toMatchObject({ status: 409, code: "ADMIN_ALREADY_EXISTS" });
  });

  it("rejects bootstrap when an inactive Admin exists", async () => {
    await insertExistingAdmin("locked");
    await expect(bootstrapFirstAdmin({ email: email("after-locked"), fullName: "Another Admin", password }))
      .rejects.toMatchObject({ status: 409, code: "ADMIN_ALREADY_EXISTS" });
  });

  it("rolls back the transaction when account insertion fails", async () => {
    const duplicateEmail = email("duplicate");
    await userRepository.insert({
      email: duplicateEmail,
      fullName: "Existing learner",
      passwordHash: await hashPasswordWithM1(password),
      role: UserRole.Learner,
      status: "active",
    });

    let failureMessage = "";
    try {
      await bootstrapFirstAdmin({ email: duplicateEmail, fullName: "Conflicting Admin", password });
    } catch (error) {
      failureMessage = error instanceof Error ? error.message : "";
    }
    expect(failureMessage).toBe("Admin bootstrap failed; the transaction was rolled back");
    expect(failureMessage).not.toContain(password);
    expect(failureMessage).not.toContain("$argon2id$");

    const remainingAdmins = await db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin));
    const preservedLearners = await db.select({ id: users.id }).from(users).where(eq(users.email, duplicateEmail));
    expect(remainingAdmins).toHaveLength(0);
    expect(preservedLearners).toHaveLength(1);
  });

  it("allows only one winner for concurrent first-Admin bootstrap attempts", async () => {
    const attempts = await Promise.allSettled([
      bootstrapFirstAdmin({ email: email("concurrent-one"), fullName: "Concurrent One", password }),
      bootstrapFirstAdmin({ email: email("concurrent-two"), fullName: "Concurrent Two", password }),
    ]);

    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((result) => result.status === "rejected")).toHaveLength(1);
    const remainingAdmins = await db.select({ id: users.id }).from(users).where(eq(users.role, UserRole.Admin));
    expect(remainingAdmins).toHaveLength(1);
  });
});
