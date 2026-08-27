import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common";
import { SupabaseClient } from "@supabase/supabase-js";
import { Inject } from "@nestjs/common";
import { UsersService } from "../users/users.service";

@Injectable()
export class SupabaseAuthService {
  constructor(
    private readonly usersService: UsersService,
    @Inject("SUPABASE_CLIENT")
    private readonly supabase: SupabaseClient,
  ) {}

  async signUp(email: string, password: string, name: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });

    if (error) {
      throw new ConflictException(error.message);
    }

    if (data.user) {
      await this.usersService.create({
        id: data.user.id,
        email,
        name,
      });
    }

    return data;
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const user = await this.usersService.findOne(data.user.id);

    return {
      user,
      session: data.session,
    };
  }

  async getUser(userId: string) {
    return this.usersService.findOne(userId);
  }
}
