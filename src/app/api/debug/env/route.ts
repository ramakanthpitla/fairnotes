import { NextResponse } from 'next/server';

export async function GET() {
    // Only show partial values for security
    const debugInfo = {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'NOT SET',
        NEXTAUTH_URL_LENGTH: process.env.NEXTAUTH_URL?.length || 0,
        GOOGLE_CLIENT_ID_PREFIX: process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...' || 'NOT SET',
        GOOGLE_CLIENT_SECRET_SET: !!process.env.GOOGLE_CLIENT_SECRET,
        NEXTAUTH_SECRET_SET: !!process.env.NEXTAUTH_SECRET,
        NODE_ENV: process.env.NODE_ENV,
    };

    return NextResponse.json(debugInfo);
}
