import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

export default async function Home() {
  const session = await getServerSession();
  
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  
  // Non dovrebbe mai arrivare qui, ma è necessario per TypeScript
  return null;
}
