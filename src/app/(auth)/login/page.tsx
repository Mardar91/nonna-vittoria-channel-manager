import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import LoginForm from '@/components/LoginForm';

export default async function LoginPage() {
  const session = await getServerSession();
  
  if (session) {
    redirect('/dashboard');
  }
  
  return <LoginForm />;
}
