import { Toaster } from '@qingmo/shadcn/components/sonner';
import { RouterProvider } from 'react-router';

import { router } from './router/routes';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
