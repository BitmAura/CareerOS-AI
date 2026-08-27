import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { AuthService } from "../auth.service";

@Injectable()
export class LocalAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { email, password } = request.body;
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      return false;
    }
    request.user = user;
    return true;
  }
}
