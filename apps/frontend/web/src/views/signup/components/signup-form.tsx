import { zodResolver } from '@hookform/resolvers/zod';
import { memo, useCallback, useState } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';
import { z } from 'zod';

import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InteractiveHoverButton } from '@/components/ui/interactive-hover-button';
import { PasswordToggleButton } from '@/components/ui/password-toggle-button';
import { register } from '@/service/api/auth';
import { useAuthVisualStore } from '@/stores/auth/use-auth-visual';
import { showToast } from '@/utils/toast';

const signupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, { message: '请输入昵称' })
      .max(50, { message: '昵称不能超过50个字符' }),
    email: z.email({ message: '请输入有效的邮箱地址' }),
    password: z.string().min(8, { message: '密码长度不能小于8位' }),
    confirmPassword: z.string().min(8, { message: '请再次输入密码' }),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type SignupFormValues = z.infer<typeof signupSchema>;

type FormControl = Control<SignupFormValues>;
type PasswordFieldName = 'password' | 'confirmPassword';

type TextInputProps = {
  control: FormControl;
  name: 'name' | 'email';
  label: string;
  placeholder: string;
  type?: 'text' | 'email';
  autoComplete?: string;
};

const TextInput = memo(
  ({
    control,
    name,
    label,
    placeholder,
    type = 'text',
    autoComplete = 'off',
  }: TextInputProps) => {
    return (
      <Field className='space-y-2'>
        <FieldLabel
          htmlFor={name}
          className='text-sm font-medium'
        >
          {label}
        </FieldLabel>
        <Controller
          name={name}
          control={control}
          render={({ field, fieldState }) => {
            return (
              <>
                <Input
                  id={name}
                  type={type}
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  {...field}
                  className='h-12 border-border/60 bg-background focus:border-primary'
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
  },
);
TextInput.displayName = 'TextInput';

type PasswordInputProps = {
  control: FormControl;
  name: PasswordFieldName;
  label: string;
  placeholder: string;
};

const PasswordController = memo(
  ({ control, name, placeholder }: Omit<PasswordInputProps, 'label'>) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = name === 'password' ? 'signup-password' : 'signup-confirm';
    const setVisualShowPassword = useAuthVisualStore(
      (state) => state.setShowPassword,
    );
    const setPasswordLength = useAuthVisualStore(
      (state) => state.setPasswordLength,
    );
    const setIsPasswordFocused = useAuthVisualStore(
      (state) => state.setIsPasswordFocused,
    );

    const handlePasswordBlur = useCallback(() => {
      setIsPasswordFocused(false);
    }, [setIsPasswordFocused]);

    const handlePasswordToggle = useCallback(() => {
      setShowPassword((value) => {
        const nextShowPassword = !value;
        setVisualShowPassword(nextShowPassword);
        return nextShowPassword;
      });
    }, [setVisualShowPassword]);

    return (
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState }) => {
          return (
            <>
              <div className='relative'>
                <Input
                  id={inputId}
                  type={showPassword ? 'text' : 'password'}
                  placeholder={placeholder}
                  {...field}
                  onFocus={() => {
                    setIsPasswordFocused(true);
                    setPasswordLength(field.value.length);
                    setVisualShowPassword(showPassword);
                  }}
                  onBlur={() => {
                    field.onBlur();
                    handlePasswordBlur();
                  }}
                  onChange={(event) => {
                    field.onChange(event);
                    setPasswordLength(event.target.value.length);
                  }}
                  className='h-12 border-border/60 bg-background pr-11 focus:border-primary'
                />
                <PasswordToggleButton
                  showPassword={showPassword}
                  onToggle={handlePasswordToggle}
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
  },
);
PasswordController.displayName = 'PasswordController';

const PasswordInput = memo(
  ({ control, name, label, placeholder }: PasswordInputProps) => {
    const inputId = name === 'password' ? 'signup-password' : 'signup-confirm';

    return (
      <Field className='space-y-2'>
        <FieldLabel
          htmlFor={inputId}
          className='text-sm font-medium'
        >
          {label}
        </FieldLabel>
        <PasswordController
          control={control}
          name={name}
          placeholder={placeholder}
        />
      </Field>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

type SubmitButtonProps = {
  isLoading: boolean;
};

const SubmitButton = memo(({ isLoading }: SubmitButtonProps) => {
  return (
    <InteractiveHoverButton
      type='submit'
      text={isLoading ? '注册中...' : '创建账号'}
      className='h-12 w-full text-base font-medium'
      disabled={isLoading}
    />
  );
});
SubmitButton.displayName = 'SubmitButton';

const LoginLink = memo(() => {
  return (
    <div className='mt-8 text-center text-sm text-muted-foreground'>
      已有账号？
      <Link
        to='/login'
        className='font-medium text-foreground hover:underline'
      >
        去登录
      </Link>
    </div>
  );
});
LoginLink.displayName = 'LoginLink';

export default function SignupForm() {
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const { control, handleSubmit } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);

    register({
      email: values.email,
      name: values.name,
      password: values.password,
    })
      .then(() => {
        showToast.success('注册成功', {
          description: '现在可以使用邮箱和密码登录了',
        });
        navigate('/login', { replace: true });
      })
      .catch(() => {
        showToast.error('注册失败', {
          description: '请检查注册信息后重试',
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return (
    <div className='w-full max-w-[420px]'>
      <div className='mb-12 flex items-center justify-center gap-2 text-lg font-semibold lg:hidden'>
        <img
          src='/logo.png'
          alt='轻墨文档 logo'
          width={32}
          height={32}
          className='dark:rounded-md dark:bg-white dark:p-1'
        />
        <span>轻墨文档</span>
      </div>

      <div className='mb-10 text-center'>
        <h1 className='mb-2 text-3xl font-bold tracking-tight'>创建账号</h1>
        <p className='text-sm text-muted-foreground'>开始同步你的文档记忆</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        autoComplete='off'
      >
        <FieldGroup className='space-y-5'>
          <TextInput
            control={control}
            name='name'
            label='昵称'
            placeholder='请输入你的昵称'
          />
          <TextInput
            control={control}
            name='email'
            label='邮箱'
            type='email'
            placeholder='请输入你的邮箱'
          />
          <PasswordInput
            control={control}
            name='password'
            label='密码'
            placeholder='请输入你的密码'
          />
          <PasswordInput
            control={control}
            name='confirmPassword'
            label='确认密码'
            placeholder='请再次输入密码'
          />
          <Field>
            <SubmitButton isLoading={isLoading} />
          </Field>
        </FieldGroup>
      </form>

      <LoginLink />
    </div>
  );
}
