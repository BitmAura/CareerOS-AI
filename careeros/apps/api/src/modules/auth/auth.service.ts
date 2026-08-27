import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { UsersService } from "../users/users.service";
import { User } from "../users/entities/user.entity";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  plan: string;
  avatarUrl?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user?.password) return null;
    const ok = await bcrypt.compare(password, user.password);
    return ok ? user : null;
  }

  async register(userData: { email: string; name: string; password: string }) {
    const existing = await this.usersService.findByEmail(userData.email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);
    const user = await this.usersService.create({
      email: userData.email,
      name: userData.name,
      password: passwordHash,
      plan: "starter",
    });

    return this.buildAuthResponse(user);
  }

  async loginWithCredentials(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return this.buildAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new UnauthorizedException();
    }
    return { user: this.toSafeUser(user) };
  }

  buildAuthResponse(user: User) {
    const safe = this.toSafeUser(user);
    return {
      access_token: this.jwtService.sign({ email: user.email, sub: user.id }),
      user: safe,
    };
  }

  private toSafeUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan || "starter",
      avatarUrl: user.avatarUrl,
    };
  }
}
