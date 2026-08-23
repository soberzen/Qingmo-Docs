import { type ReactNode, memo } from 'react';
import { Link } from 'react-router';

import { AnimatedCharacters } from '@/components/ui/animated-characters';
import { useAuthVisualStore } from '@/stores/auth/use-auth-visual';

type AuthLayoutProps = {
  children: ReactNode;
};

const BrandLink = memo(() => {
  return (
    <Link
      to='/'
      className='flex items-center gap-2 text-lg font-semibold'
    >
      <img
        src='/logo.png'
        alt='轻墨文档 logo'
        width={32}
        height={32}
        className='rounded-lg bg-white/10 p-1 backdrop-blur-sm'
      />
      <span>轻墨文档</span>
    </Link>
  );
});
BrandLink.displayName = 'BrandLink';

const AuthVisual = memo(() => {
  const showPassword = useAuthVisualStore((state) => state.showPassword);
  const passwordLength = useAuthVisualStore((state) => state.passwordLength);
  const isPasswordFocused = useAuthVisualStore(
    (state) => state.isPasswordFocused,
  );

  const isTyping = isPasswordFocused && passwordLength > 0;

  return (
    <div className='relative z-20 flex h-[500px] items-end justify-center'>
      <AnimatedCharacters
        isTyping={isTyping}
        showPassword={showPassword}
        passwordLength={passwordLength}
      />
    </div>
  );
});

AuthVisual.displayName = 'AuthVisual';

export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className='grid min-h-dvh lg:h-dvh lg:grid-cols-2'>
      <div className='relative hidden flex-col justify-between bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600 p-12 text-white dark:from-white/90 dark:via-white/80 dark:to-white/70 dark:text-gray-900 lg:flex'>
        <div className='relative z-20'>
          <BrandLink />
        </div>
        <AuthVisual />
      </div>
      <div className='flex min-w-0 items-start justify-center bg-background px-6 py-10 sm:px-8 sm:py-12 lg:min-h-0 lg:items-center'>
        {children}
      </div>
    </div>
  );
}
