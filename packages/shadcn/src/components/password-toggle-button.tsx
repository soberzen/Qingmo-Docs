import { Eye, EyeOff } from 'lucide-react';
import { memo } from 'react';

type PasswordToggleButtonProps = {
  showPassword: boolean;
  onToggle: () => void;
};

const PasswordToggleButton = memo(
  ({ showPassword, onToggle }: PasswordToggleButtonProps) => {
    return (
      <button
        type='button'
        onMouseDown={(event) => event.preventDefault()}
        onClick={onToggle}
        aria-label={showPassword ? '隐藏密码' : '显示密码'}
        className='absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground'
      >
        {showPassword ? (
          <Eye className='size-5' />
        ) : (
          <EyeOff className='size-5' />
        )}
      </button>
    );
  },
);
PasswordToggleButton.displayName = 'PasswordToggleButton';

export { PasswordToggleButton };
