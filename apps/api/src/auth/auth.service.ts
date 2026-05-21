import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type { Database, User, UserRole } from "@aquaponics/db";
import type { Kysely } from "kysely";
import bcrypt from "bcryptjs";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";
import jwt from "jsonwebtoken";
import { DB_TOKEN } from "../database/database.constants.js";
import type { GqlContext } from "./gql-context.js";

const SESSION_COOKIE_NAME = process.env.NODE_ENV === "production" ? "aq_session" : "aq_session_dev";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const RENEWAL_WINDOW_SECONDS = 60 * 60 * 24 * 7;

interface SessionPayload {
  sub: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(@Inject(DB_TOKEN) private readonly db: Kysely<Database>) {}

  private getSecret(): string {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("AUTH_SECRET is required");
    }
    return secret;
  }

  private signToken(userId: string): string {
    return jwt.sign({}, this.getSecret(), {
      subject: userId,
      expiresIn: SESSION_TTL_SECONDS
    });
  }

  private appendSetCookie(res: GqlContext["res"], value: string): void {
    const existing = res.getHeader("set-cookie");
    if (!existing) {
      res.setHeader("set-cookie", value);
      return;
    }
    const arrayValue = Array.isArray(existing) ? existing : [String(existing)];
    res.setHeader("set-cookie", [...arrayValue, value]);
  }

  setSessionCookie(res: GqlContext["res"], userId: string): void {
    const cookieValue = serializeCookie(SESSION_COOKIE_NAME, this.signToken(userId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_TTL_SECONDS
    });

    this.appendSetCookie(res, cookieValue);
  }

  clearSessionCookie(res: GqlContext["res"]): void {
    const cookieValue = serializeCookie(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0
    });

    this.appendSetCookie(res, cookieValue);
  }

  async authenticate(email: string, password: string): Promise<User> {
    if (typeof email !== "string" || typeof password !== "string") {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email.toLowerCase().trim())
      .executeTakeFirst();

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    return user;
  }

  async getCurrentUser(req: GqlContext["req"], res: GqlContext["res"]): Promise<User | null> {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return null;
    }

    const cookies = parseCookie(cookieHeader);
    const token = cookies[SESSION_COOKIE_NAME];
    if (!token) {
      return null;
    }

    let payload: SessionPayload;
    try {
      payload = jwt.verify(token, this.getSecret()) as SessionPayload;
    } catch {
      return null;
    }

    const user = await this.db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", payload.sub)
      .executeTakeFirst();
    if (!user) {
      return null;
    }

    const remainingSeconds = payload.exp - Math.floor(Date.now() / 1000);
    if (remainingSeconds < RENEWAL_WINDOW_SECONDS) {
      this.setSessionCookie(res, user.id);
    }

    return user;
  }

  async requireSiteAccess(user: User, siteId: string): Promise<boolean> {
    if (user.role === "admin") {
      return true;
    }

    const assignment = await this.db
      .selectFrom("user_sites")
      .select(["site_id"])
      .where("user_id", "=", user.id)
      .where("site_id", "=", siteId)
      .executeTakeFirst();

    return Boolean(assignment);
  }

  isAdmin(role: UserRole): boolean {
    return role === "admin";
  }

  async updateMe(
    userId: string,
    input: {
      currentPassword: string;
      name?: string;
      email?: string;
      newPassword?: string;
    },
    res: GqlContext["res"]
  ): Promise<User> {
    const user = await this.db.selectFrom("users").selectAll().where("id", "=", userId).executeTakeFirstOrThrow();

    const currentOk = await bcrypt.compare(input.currentPassword, user.password_hash);
    if (!currentOk) {
      throw new UnauthorizedException("Invalid current password");
    }

    const hasName = input.name !== undefined && input.name.trim() !== "";
    const hasEmail = input.email !== undefined && input.email.trim() !== "";
    const hasNewPassword = input.newPassword !== undefined && input.newPassword.trim() !== "";

    if (!hasName && !hasEmail && !hasNewPassword) {
      throw new BadRequestException("Nothing to update");
    }

    const nextName = hasName ? input.name!.trim() : user.name;
    const nextEmail = hasEmail ? input.email!.toLowerCase().trim() : user.email;

    if (nextEmail !== user.email) {
      const clash = await this.db.selectFrom("users").select("id").where("email", "=", nextEmail).executeTakeFirst();
      if (clash) {
        throw new ConflictException("Email already in use");
      }
    }

    const passwordHash = hasNewPassword ? await bcrypt.hash(input.newPassword!, 12) : user.password_hash;

    const updated = await this.db
      .updateTable("users")
      .set({
        name: nextName,
        email: nextEmail,
        password_hash: passwordHash,
        updated_at: new Date()
      })
      .where("id", "=", userId)
      .returningAll()
      .executeTakeFirstOrThrow();

    this.clearSessionCookie(res);
    return updated;
  }
}
