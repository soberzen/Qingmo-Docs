import { create } from 'zustand';

type AuthVisualState = {
  showPassword: boolean;
  isPasswordFocused: boolean;
  passwordLength: number;

  toggleShowPassword: () => void;
  setShowPassword: (showPassword: boolean) => void;
  setIsPasswordFocused: (isFocused: boolean) => void;
  setPasswordLength: (length: number) => void;
};

export const useAuthVisualStore = create<AuthVisualState>((set) => ({
  showPassword: false,
  isPasswordFocused: false,
  passwordLength: 0,

  toggleShowPassword: () => {
    set((state) => ({ showPassword: !state.showPassword }));
  },
  setShowPassword: (showPassword) => {
    set({ showPassword });
  },
  setIsPasswordFocused: (isFocused) => {
    set({ isPasswordFocused: isFocused });
  },
  setPasswordLength: (passwordLength) => set({ passwordLength }),
}));
