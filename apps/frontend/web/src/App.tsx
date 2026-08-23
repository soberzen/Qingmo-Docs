import { RouterProvider } from 'react-router';

import { Toaster } from '@/components/ui/sonner';

import { router } from './router/routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
