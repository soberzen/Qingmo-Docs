import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, memo, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { z } from 'zod';

import { Checkbox } from '@/components/ui/checkbox';
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { PasswordToggleButton } from '@/components/ui/password-toggle-button';
import { login } from '@/service/api/auth';
import { useAuthVisualStore } from '@/stores/auth/use-auth-visual';
import { setToken } from '@/utils/auth';
import { showToast } from '@/utils/toast';

const loginSchema = z.object({
  email: z.email({ message: '请输入有效的邮箱地址' }),
  password: z.string().min(8, { message: '密码长度不能小于8位' }),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

type FormControl = Control<LoginFormValues>;

type PasswordInputProps = {
  control: FormControl;
};

const PasswordLabel = memo(() => {
  return (
    <FieldLabel
      htmlFor='password'
      className='text-sm font-medium'
    >
      密码
    </FieldLabel>
  );
});

const PasswordController = memo(({ control }: PasswordInputProps) => {
  const showPassword = useAuthVisualStore((state) => state.showPassword);
  const toggleShowPassword = useAuthVisualStore(
    (state) => state.toggleShowPassword,
  );
  const setPasswordLength = useAuthVisualStore(
    (state) => state.setPasswordLength,
  );
  const setIsPasswordFocused = useAuthVisualStore(
    (state) => state.setIsPasswordFocused,
  );
  const handlePasswordFocus = useCallback(() => {
    setIsPasswordFocused(true);
  }, [setIsPasswordFocused]);

  const handlePasswordBlur = useCallback(() => {
    setIsPasswordFocused(false);
  }, [setIsPasswordFocused]);
  return (
    <Controller
      name='password'
      control={control}
      render={({ field, fieldState }) => {
        return (
          <>
            <div className='relative'>
              <Input
                id='password'
                type={showPassword ? 'text' : 'password'}
                placeholder='请输入你的密码'
                {...field}
                onFocus={handlePasswordFocus}
                onBlur={handlePasswordBlur}
                onChange={(event) => {
                  field.onChange(event);
                  setPasswordLength(event.target.value.length);
                }}
                className='h-12 bg-background border-border/60 focus:border-primary'
              />
              <PasswordToggleButton
                showPassword={showPassword}
                onToggle={toggleShowPassword}
              />
            </div>
            {fieldState.invalid && (
              <FieldError
                className='text-sm text-destructive'
                errors={[fieldState.error]}
              />
            )}
          </>
        );
      }}
    />
  );
});
PasswordController.displayName = 'PasswordController';

const PasswordInput = memo(({ control }: PasswordInputProps) => {
  return (
    <Field className='space-y-2'>
      <PasswordLabel />
      <PasswordController control={control} />
    </Field>
  );
});

type EmailInputProps = {
  control: FormControl;
};
const EmailInput = memo(({ control }: EmailInputProps) => {
  return (
    <Field className='space-y-2'>
      <FieldLabel
        htmlFor='email'
        className='text-sm font-medium'
      >
        邮箱
      </FieldLabel>
      <Controller
        name='email'
        control={control}
        render={({ field, fieldState }) => {
          return (
            <>
              <Input
                id='email'
                type='email'
                placeholder='请输入你的邮箱'
                {...field}
                className='h-12 bg-background border-border/60 focus:border-primary'
              />
              {fieldState.invalid && (
                <FieldError
                  className='text-sm text-destructive'
                  errors={[fieldState.error]}
                />
              )}
            </>
          );
        }}
      />
    </Field>
  );
});

type FormFooterProps = {
  control: FormControl;
};

const FormFooter = memo(({ control }: FormFooterProps) => {
  return (
    <div className='flex items-center justify-between'>
      <div className='flex items-center space-x-2'>
        <Field orientation='horizontal'>
          <Controller
            name='remember'
            control={control}
            render={({ field }) => (
              <>
                <Checkbox
                  id='remember'
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                />
              </>
            )}
          />
          <FieldLabel htmlFor='remember'>记住密码</FieldLabel>
        </Field>
      </div>
      <Link
        to='/forgot-password'
        className='text-sm text-primary hover:underline font-medium'
      >
        忘记密码？
      </Link>
    </div>
  );
});

type SubmitButtonProps = {
  isLoading: boolean;
};
const SubmitButton = memo(({ isLoading }: SubmitButtonProps) => {
  return (
    <InteractiveHoverButton
      type='submit'
      text={isLoading ? '登陆中...' : '登陆'}
      className='w-full h-12 text-base font-medium'
      disabled={isLoading}
    />
  );
});

const SocialLogin = memo(() => {
  const handleLoginWithWeChat = useCallback(() => {
    showToast.error('微信登录功能暂未实现', {
      description: '请使用邮箱和密码登录',
    });
  }, []);
  return (
    <div className='mt-6'>
      <InteractiveHoverButton
        type='button'
        text='使用微信登陆'
        onClick={handleLoginWithWeChat}
        className='w-full h-12 border-border/60'
        icon={
          <svg
            viewBox='0 0 1024 1024'
            version='1.1'
            xmlns='http://www.w3.org/2000/svg'
            p-id='3025'
            className='h-5 w-5'
          >
            <path
              d='M670.023548 368.251062c10.259668 0 20.38119 0.787946 30.53648 1.902326-27.361161-127.435391-163.538657-222.082004-319.066873-222.082004-173.813674 0-316.202639 118.450762-316.202639 268.934079 0 86.831624 47.341215 158.128437 126.509299 213.512838l-31.583323 95.101985 110.560048-55.386448c39.524179 7.748475 71.228251 15.809057 110.716614 15.809057 9.930163 0 19.771299-0.451278 29.473265-1.187035-6.123464-21.147646-9.771551-43.274596-9.771551-66.340941C401.265478 480.380862 519.85234 368.251062 670.023548 368.251062L670.023548 368.251062zM500.047272 282.537911c23.887037 0 39.591717 15.70468 39.591717 39.470967 0 23.679305-15.705704 39.542598-39.591717 39.542598-23.627117 0-47.410799-15.863293-47.410799-39.542598C452.636472 298.17403 476.366943 282.537911 500.047272 282.537911L500.047272 282.537911zM278.751167 361.551476c-23.731494 0-47.619554-15.863293-47.619554-39.542598 0-23.76731 23.88806-39.470967 47.619554-39.470967s39.488363 15.636119 39.488363 39.470967C318.23953 345.688183 302.482661 361.551476 278.751167 361.551476L278.751167 361.551476zM278.751167 361.551476'
              fill='#ffffff'
              p-id='3026'
            ></path>
            <path
              d='M958.709483 614.70822c0-126.403898-126.543068-229.42832-268.652669-229.42832-150.485363 0-268.915659 103.09503-268.915659 229.42832 0 126.753869 118.498858 229.462089 268.915659 229.462089 31.514761 0 63.272046-7.886621 94.89016-15.809057l86.690408 47.567365-23.76731-79.048357C911.351895 749.174748 958.709483 686.041872 958.709483 614.70822L958.709483 614.70822zM602.842473 575.132876c-15.70468 0-31.618115-15.633049-31.618115-31.618115 0-15.739473 15.914458-31.583323 31.618115-31.583323 24.010857 0 39.576367 15.84385 39.576367 31.583323C642.41884 559.499827 626.853329 575.132876 602.842473 575.132876L602.842473 575.132876zM776.78099 575.132876c-15.565511 0-31.445176-15.633049-31.445176-31.618115 0-15.739473 15.809057-31.583323 31.445176-31.583323 23.801079 0 39.576367 15.84385 39.576367 31.583323C816.356334 559.499827 800.581046 575.132876 776.78099 575.132876L776.78099 575.132876zM776.78099 575.132876'
              fill='#ffffff'
              p-id='3027'
            ></path>
          </svg>
        }
      />
    </div>
  );
});

const SignupLink = memo(() => {
  return (
    <div className='text-center text-sm text-muted-foreground mt-8'>
      还没有账号？
      <Link
        to='/signup'
        className='text-foreground font-medium hover:underline'
      >
        立即注册
      </Link>
    </div>
  );
});

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rawRedirect = searchParams.get('redirect') || '/';

  const redirect =
    rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
      ? rawRedirect
      : '/';

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema), // 绑定 Zod 校验
    defaultValues: {
      email: '',
      password: '',
      remember: false,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);

    login(values)
      .then((res) => {
        const { accessToken } = res.data;
        setToken(accessToken);
        navigate(redirect, { replace: true });
      })
      .catch(() => {
        showToast.error('登录失败', {
          description: '请检查邮箱和密码是否正确',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className='w-full max-w-[420px]'>
      <div className='lg:hidden flex items-center justify-center gap-2 text-lg font-semibold mb-12'>
        <img
          src='/logo.png'
          alt='轻墨文档 logo'
          width={32}
          height={32}
          className='dark:bg-white dark:p-1 dark:rounded-md'
        />
        <span>轻墨文档</span>
      </div>
      {/* header */}
      <div className='text-center mb-10'>
        <h1 className='text-3xl font-bold tracking-tight mb-2'>欢迎回来！</h1>
        <p className='text-muted-foreground text-sm'>请输入登录信息</p>
      </div>

      {/* form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className='space-y-5'>
          <EmailInput control={control} />
          <PasswordInput control={control} />
          <FormFooter control={control} />
          <Field>
            <SubmitButton isLoading={isLoading} />
          </Field>
        </FieldGroup>
      </form>
      <SocialLogin />
      <SignupLink />
    </div>
  );
}
