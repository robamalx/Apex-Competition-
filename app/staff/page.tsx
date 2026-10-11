import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function StaffPage() {
  const { sessionClaims, userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
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
    redirect('/');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      <div className="max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h1 className="text-2xl font-bold text-sky-400 mb-2">Staff Portal</h1>
        <p className="text-slate-300 mb-4">
          Protected route verified via Clerk <code className="text-sky-300">publicMetadata</code>.
        </p>
        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm">
          <p><span className="text-slate-400">User ID:</span> {userId}</p>
          <p><span className="text-slate-400">Assigned Role:</span> <span className="font-semibold text-sky-400">{String(role)}</span></p>
        </div>
      </div>
    </div>
  );
}
