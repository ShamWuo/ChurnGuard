import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminCspRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin-csp'); }, [router]);
  return null;
}
