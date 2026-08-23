import AuthLayout from '@/layouts/auth/auth-layout';

import SignupForm from './components/signup-form';

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}
