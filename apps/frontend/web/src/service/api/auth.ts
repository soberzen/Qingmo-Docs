import { z } from 'zod';

import { get, post } from '../base';
import type { AccessTokenResponse, HTTPResponse } from '../fetch';

export const LoginSchema = z.object({
  email: z.email('请输入有效的邮箱地址'),
  password: z.string().min(1, '密码不能为空'),
});

export const RegisterSchema = z.object({
  email: z.email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码长度至少为6位'),
  name: z.string().min(1, '用户名不能为空'),
  avatarUrl: z.string().url('头像URL格式不正确').optional(),
});

export const UserSchema = z.object({
  name: z.string(),
  email: z.email(),
  avatarUrl: z.string().url().optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;
export type RegisterDto = z.infer<typeof RegisterSchema>;
export type User = z.infer<typeof UserSchema>;

export function login(data: LoginDto) {
  return post<AccessTokenResponse>('/auth/login', {
    body: data,
    credentials: 'include',
  });
}

export function register(data: RegisterDto) {
  return post<HTTPResponse<User>>('/auth/register', { body: data });
}

export function refresh() {
  return post<AccessTokenResponse>('/auth/refresh', {
    credentials: 'include',
  });
}

export function logout() {
  return post<HTTPResponse<null>>('/auth/logout', {
    credentials: 'include',
  });
}

export function getProfile() {
  return get<HTTPResponse<User>>('/auth/profile', {
    credentials: 'include',
  });
}
