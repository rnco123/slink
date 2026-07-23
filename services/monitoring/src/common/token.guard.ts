import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common"
import { Request } from "express"
import { loadEnv } from "../config/env"

/**
 * Optional shared-secret gate. When MONITORING_API_TOKEN is set, every request
 * must present it as `Authorization: Bearer <token>` or `x-api-key: <token>`.
 * The admin panel injects the token server-side; the browser never holds an
 * upstream credential. When the token is empty (local dev) the guard is a no-op
 * — the API is only bound to loopback in that case.
 */
@Injectable()
export class TokenGuard implements CanActivate {
  private readonly token = loadEnv().MONITORING_API_TOKEN

  canActivate(context: ExecutionContext): boolean {
    if (!this.token) return true
    const req = context.switchToHttp().getRequest<Request>()
    const auth = req.header("authorization") ?? ""
    const bearer = auth.toLowerCase().startsWith("bearer ")
      ? auth.slice(7).trim()
      : ""
    const apiKey = req.header("x-api-key") ?? ""
    const presented = bearer || apiKey
    if (presented && timingSafeEqual(presented, this.token)) return true
    throw new UnauthorizedException("invalid or missing monitoring API token")
  }
}

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
