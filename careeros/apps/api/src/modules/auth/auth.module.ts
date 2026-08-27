import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { SupabaseAuthService } from "./supabase-auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LocalStrategy } from "./strategies/local.strategy";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { LocalAuthGuard } from "./guards/local-auth.guard";
import { UsersModule } from "../users/users.module";
import { ProvidersModule } from "../../providers/providers.module";

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    ProvidersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "change-me-in-production",
      signOptions: { expiresIn: process.env.JWT_EXPIRY || "7d" },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthService, JwtStrategy, LocalStrategy, JwtAuthGuard, LocalAuthGuard],
  exports: [AuthService, SupabaseAuthService, JwtAuthGuard, LocalAuthGuard],
})
export class AuthModule {}
