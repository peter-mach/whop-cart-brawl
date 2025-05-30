import { NextRequest } from 'next/server';
import { verifyUserToken } from './whop-api';

export interface AuthenticatedUser {
  id: string;
  username?: string;
  email?: string;
  // Add other user properties as needed
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Middleware to authenticate users using Whop tokens
 */
export async function authenticateUser(
  request: NextRequest
): Promise<AuthResult> {
  try {
    // Extract token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return {
        success: false,
        error: 'No authorization header provided',
      };
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return {
        success: false,
        error: 'No token provided in authorization header',
      };
    }

    // Verify token with Whop
    const user = await verifyUserToken(token);

    if (!user?.id) {
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
    };
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>
) {
  return async function (request: NextRequest): Promise<Response> {
    const authResult = await authenticateUser(request);

    if (!authResult.success || !authResult.user) {
      return new Response(JSON.stringify({ error: authResult.error }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return handler(request, authResult.user);
  };
}

/**
 * Extract user ID from request headers (for routes that need it)
 */
export async function extractUserId(
  request: NextRequest
): Promise<string | null> {
  const authResult = await authenticateUser(request);
  return authResult.success ? authResult.user?.id || null : null;
}

/**
 * Middleware for optional authentication (user might or might not be logged in)
 */
export async function optionalAuth(request: NextRequest): Promise<{
  user?: AuthenticatedUser;
  isAuthenticated: boolean;
}> {
  const authResult = await authenticateUser(request);

  return {
    user: authResult.user,
    isAuthenticated: authResult.success,
  };
}
