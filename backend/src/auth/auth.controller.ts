import { Controller, Get, Post, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('login')
  login() {
    // OIDC login will be handled by passport strategy
    return { message: 'Redirecting to OIDC provider' };
  }

  @Get('logout')
  logout() {
    return { message: 'Logged out successfully' };
  }

  @Get('profile')
  getProfile() {
    return { message: 'Protected route - user profile' };
  }
}