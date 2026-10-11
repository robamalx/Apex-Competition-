import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { sessionClaims, userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: Sign in required' }, { status: 401 });
    }

    const user = await currentUser();
    const role =
      (sessionClaims?.metadata as any)?.role ||
      (sessionClaims?.publicMetadata as any)?.role ||
      user?.publicMetadata?.role;

    const staffRoles = [
      'admin',
      'staff',
      'ADMIN',
      'SUPER_ADMIN',
      'COMPETITION_PUBLISHER',
      'WALLET_MANAGER',
      'PAYMENT_VERIFIER',
      'ADVERTISEMENT_MANAGER',
      'CUSTOMER_SUPPORT'
    ];
    const isStaff = staffRoles.includes(String(role));

    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      message: 'Staff endpoint authorized via Clerk publicMetadata',
      userId,
      role
    });
  } catch (error: any) {
    console.error('[Staff API Route Error]:', error?.message || error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
