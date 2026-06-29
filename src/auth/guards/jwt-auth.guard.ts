import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that protects routes by requiring a valid JWT access token.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   @Get('profile')
 *   getProfile(@Request() req) {
 *     return req.user; // The validated employee object
 *   }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
