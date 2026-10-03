import { Controller, Post, Get, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// M7: credential endpoints get their own tight budget (global guard is a
// coarse 100 req/min backstop shared with every route). 10 attempts/min/IP
// makes online password guessing impractical without affecting real users.
const CREDENTIAL_THROTTLE = { default: { limit: 10, ttl: 60000 } } as const;

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'User successfully logged in' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('refresh-token')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refreshToken(@CurrentUser() user: any, @Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(user, dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  async logout(@CurrentUser() user: any) {
    return this.authService.logout(user.id);
  }

  @Get('google/url')
  @ApiOperation({ summary: 'Get Google OAuth Authorization URL' })
  @ApiResponse({ status: 200, description: 'Google authorization URL generated' })
  getGoogleAuthUrl() {
    return this.authService.getGoogleAuthUrl();
  }

  @Throttle(CREDENTIAL_THROTTLE)
  @Post('google/callback')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user via Google authorization code' })
  @ApiResponse({ status: 200, description: 'User successfully authenticated via Google' })
  async googleCallback(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto.code, dto.state);
  }
}
