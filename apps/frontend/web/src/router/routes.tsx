import { lazy } from 'react';
import { createBrowserRouter } from 'react-router';

import RootRoute, { GuestRoute } from '@/layouts/route/route-layout';

const Login = lazy(() => import('@/views/login/page'));
const Signup = lazy(() => import('@/views/signup/page'));
const NotFound = lazy(() => import('@/views/not-found.tsx/not-found'));

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRoute />,
    children: [
      // 登录注册路由
      {
        element: <GuestRoute />,
        children: [
          {
            path: 'login',
            element: <Login />,
          },
          {
            path: 'signup',
            element: <Signup />,
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);
