// 摘自 https://github.com/arsh342/careercompass/blob/main/src/components/ui/animated-characters.tsx
import { useEffect, useRef, useState } from 'react';

type Offset = {
  x: number;
  y: number;
};

type CharacterPosition = {
  faceX: number;
  faceY: number;
  bodySkew: number;
};

const ZERO_OFFSET: Offset = { x: 0, y: 0 };
const ZERO_CHARACTER_POSITION: CharacterPosition = {
  faceX: 0,
  faceY: 0,
  bodySkew: 0,
};

function calculateOffsetFromElement(
  element: HTMLElement | null,
  mouseX: number,
  mouseY: number,
  maxDistance: number,
): Offset {
  if (!element) {
    return ZERO_OFFSET;
  }

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;
  const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);
  const angle = Math.atan2(deltaY, deltaX);

  return {
    x: Math.cos(angle) * distance,
    y: Math.sin(angle) * distance,
  };
}

function calculateCharacterPosition(
  element: HTMLElement | null,
  mouseX: number,
  mouseY: number,
): CharacterPosition {
  if (!element) {
    return ZERO_CHARACTER_POSITION;
  }

  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 3;
  const deltaX = mouseX - centerX;
  const deltaY = mouseY - centerY;

  return {
    faceX: Math.max(-15, Math.min(15, deltaX / 20)),
    faceY: Math.max(-10, Math.min(10, deltaY / 30)),
    bodySkew: Math.max(-6, Math.min(6, -deltaX / 120)),
  };
}

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number | undefined;
  forceLookY?: number | undefined;
}

export const Pupil = ({
  size = 12,
  maxDistance = 5,
  pupilColor = 'black',
  forceLookX,
  forceLookY,
}: PupilProps) => {
  const pupilRef = useRef<HTMLDivElement>(null);
  const hasForcedLook = forceLookX !== undefined && forceLookY !== undefined;

  useEffect(() => {
    if (hasForcedLook || !pupilRef.current) {
      return;
    }

    let frameId = 0;
    let mouseX = 0;
    let mouseY = 0;

    const updatePosition = () => {
      frameId = 0;

      const position = calculateOffsetFromElement(
        pupilRef.current,
        mouseX,
        mouseY,
        maxDistance,
      );

      pupilRef.current?.style.setProperty('--pupil-x', `${position.x}px`);
      pupilRef.current?.style.setProperty('--pupil-y', `${position.y}px`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (frameId === 0) {
        frameId = requestAnimationFrame(updatePosition);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, [hasForcedLook, maxDistance]);

  const transform = hasForcedLook
    ? `translate(${forceLookX}px, ${forceLookY}px)`
    : 'translate(var(--pupil-x, 0px), var(--pupil-y, 0px))';

  return (
    <div
      ref={pupilRef}
      className='rounded-full'
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  blinkDelay?: number;
  forceLookX?: number | undefined;
  forceLookY?: number | undefined;
}

export const EyeBall = ({
  size = 48,
  pupilSize = 16,
  maxDistance = 10,
  eyeColor = 'white',
  pupilColor = 'black',
  blinkDelay = 0,
  forceLookX,
  forceLookY,
}: EyeBallProps) => {
  const eyeRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<HTMLDivElement>(null);
  const hasForcedLook = forceLookX !== undefined && forceLookY !== undefined;

  useEffect(() => {
    if (hasForcedLook || !eyeRef.current) {
      return;
    }

    let frameId = 0;
    let mouseX = 0;
    let mouseY = 0;

    const updatePosition = () => {
      frameId = 0;

      const position = calculateOffsetFromElement(
        eyeRef.current,
        mouseX,
        mouseY,
        maxDistance,
      );

      pupilRef.current?.style.setProperty('--pupil-x', `${position.x}px`);
      pupilRef.current?.style.setProperty('--pupil-y', `${position.y}px`);
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (frameId === 0) {
        frameId = requestAnimationFrame(updatePosition);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, [hasForcedLook, maxDistance]);

  const transform = hasForcedLook
    ? `translate(${forceLookX}px, ${forceLookY}px)`
    : 'translate(var(--pupil-x, 0px), var(--pupil-y, 0px))';

  return (
    <div
      ref={eyeRef}
      className='animate-eye-blink origin-top rounded-full flex items-center justify-center'
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
        animationDelay: `${blinkDelay}s`,
      }}
    >
      <div
        ref={pupilRef}
        className='rounded-full'
        style={{
          width: `${pupilSize}px`,
          height: `${pupilSize}px`,
          backgroundColor: pupilColor,
          transform,
          transition: 'transform 0.1s ease-out',
        }}
      />
    </div>
  );
};

interface AnimatedCharactersProps {
  isTyping?: boolean;
  showPassword?: boolean;
  passwordLength?: number;
}

export function AnimatedCharacters({
  isTyping = false,
  showPassword = false,
  passwordLength = 0,
}: AnimatedCharactersProps) {
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frameId = 0;
    let mouseX = 0;
    let mouseY = 0;

    const updatePositions = () => {
      frameId = 0;

      const positions = [
        [
          purpleRef.current,
          calculateCharacterPosition(purpleRef.current, mouseX, mouseY),
        ],
        [
          blackRef.current,
          calculateCharacterPosition(blackRef.current, mouseX, mouseY),
        ],
        [
          yellowRef.current,
          calculateCharacterPosition(yellowRef.current, mouseX, mouseY),
        ],
        [
          orangeRef.current,
          calculateCharacterPosition(orangeRef.current, mouseX, mouseY),
        ],
      ] as const;

      positions.forEach(([element, position]) => {
        element?.style.setProperty('--face-x', `${position.faceX}px`);
        element?.style.setProperty('--face-y', `${position.faceY}px`);
        element?.style.setProperty('--body-skew', `${position.bodySkew}deg`);
        element?.style.setProperty(
          '--body-skew-wide',
          `${position.bodySkew * 1.5}deg`,
        );
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      if (frameId === 0) {
        frameId = requestAnimationFrame(updatePositions);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(frameId);
    };
  }, []);

  // Looking at each other animation when typing starts
  useEffect(() => {
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    if (isTyping) {
      startTimer = setTimeout(() => {
        setIsLookingAtEachOther(true);
      }, 0);
      endTimer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
    } else {
      startTimer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 0);
    }

    return () => {
      if (startTimer) {
        clearTimeout(startTimer);
      }
      if (endTimer) {
        clearTimeout(endTimer);
      }
    };
  }, [isTyping]);

  // Purple sneaky peeking animation when typing password and it's visible
  useEffect(() => {
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    if (!(passwordLength > 0 && showPassword)) {
      timers.push(
        setTimeout(() => {
          setIsPurplePeeking(false);
        }, 0),
      );

      return () => timers.forEach(clearTimeout);
    }

    const schedulePeek = () => {
      const peekTimer = setTimeout(
        () => {
          setIsPurplePeeking(true);

          const hideTimer = setTimeout(() => {
            setIsPurplePeeking(false);
            schedulePeek();
          }, 800);

          timers.push(hideTimer);
        },
        Math.random() * 3000 + 2000,
      );

      timers.push(peekTimer);
    };

    schedulePeek();

    return () => timers.forEach(clearTimeout);
  }, [passwordLength, showPassword]);

  const isHidingPassword = passwordLength > 0 && !showPassword;

  return (
    <div
      className='relative'
      style={{ width: '550px', height: '400px' }}
    >
      {/* Purple tall rectangle character - Back layer */}
      <div
        ref={purpleRef}
        className='absolute bottom-0 transition-all duration-700 ease-in-out'
        style={{
          left: '70px',
          width: '180px',
          height: isTyping || isHidingPassword ? '440px' : '400px',
          backgroundColor: '#6C3FF5',
          borderRadius: '10px 10px 0 0',
          zIndex: 1,
          transform:
            passwordLength > 0 && showPassword
              ? `skewX(0deg)`
              : isTyping || isHidingPassword
                ? 'skewX(calc(var(--body-skew, 0deg) - 12deg)) translateX(40px)'
                : 'skewX(var(--body-skew, 0deg))',
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes */}
        <div
          className='absolute flex gap-8 transition-all duration-700 ease-in-out'
          style={{
            left:
              passwordLength > 0 && showPassword
                ? `${20}px`
                : isLookingAtEachOther
                  ? `${55}px`
                  : 'calc(45px + var(--face-x, 0px))',
            top:
              passwordLength > 0 && showPassword
                ? `${35}px`
                : isLookingAtEachOther
                  ? `${65}px`
                  : 'calc(40px + var(--face-y, 0px))',
          }}
        >
          <EyeBall
            size={18}
            pupilSize={7}
            maxDistance={5}
            eyeColor='white'
            pupilColor='#2D2D2D'
            blinkDelay={-1.2}
            forceLookX={
              passwordLength > 0 && showPassword
                ? isPurplePeeking
                  ? 4
                  : -4
                : isLookingAtEachOther
                  ? 3
                  : undefined
            }
            forceLookY={
              passwordLength > 0 && showPassword
                ? isPurplePeeking
                  ? 5
                  : -4
                : isLookingAtEachOther
                  ? 4
                  : undefined
            }
          />
          <EyeBall
            size={18}
            pupilSize={7}
            maxDistance={5}
            eyeColor='white'
            pupilColor='#2D2D2D'
            blinkDelay={-1.2}
            forceLookX={
              passwordLength > 0 && showPassword
                ? isPurplePeeking
                  ? 4
                  : -4
                : isLookingAtEachOther
                  ? 3
                  : undefined
            }
            forceLookY={
              passwordLength > 0 && showPassword
                ? isPurplePeeking
                  ? 5
                  : -4
                : isLookingAtEachOther
                  ? 4
                  : undefined
            }
          />
        </div>
      </div>

      {/* Black tall rectangle character - Middle layer */}
      <div
        ref={blackRef}
        className='absolute bottom-0 transition-all duration-700 ease-in-out'
        style={{
          left: '240px',
          width: '120px',
          height: '310px',
          backgroundColor: '#2D2D2D',
          borderRadius: '8px 8px 0 0',
          zIndex: 2,
          transform:
            passwordLength > 0 && showPassword
              ? `skewX(0deg)`
              : isLookingAtEachOther
                ? 'skewX(calc(var(--body-skew-wide, 0deg) + 10deg)) translateX(20px)'
                : isTyping || isHidingPassword
                  ? 'skewX(var(--body-skew-wide, 0deg))'
                  : 'skewX(var(--body-skew, 0deg))',
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes */}
        <div
          className='absolute flex gap-6 transition-all duration-700 ease-in-out'
          style={{
            left:
              passwordLength > 0 && showPassword
                ? `${10}px`
                : isLookingAtEachOther
                  ? `${32}px`
                  : 'calc(26px + var(--face-x, 0px))',
            top:
              passwordLength > 0 && showPassword
                ? `${28}px`
                : isLookingAtEachOther
                  ? `${12}px`
                  : 'calc(32px + var(--face-y, 0px))',
          }}
        >
          <EyeBall
            size={16}
            pupilSize={6}
            maxDistance={4}
            eyeColor='white'
            pupilColor='#2D2D2D'
            blinkDelay={-3.8}
            forceLookX={
              passwordLength > 0 && showPassword
                ? -4
                : isLookingAtEachOther
                  ? 0
                  : undefined
            }
            forceLookY={
              passwordLength > 0 && showPassword
                ? -4
                : isLookingAtEachOther
                  ? -4
                  : undefined
            }
          />
          <EyeBall
            size={16}
            pupilSize={6}
            maxDistance={4}
            eyeColor='white'
            pupilColor='#2D2D2D'
            blinkDelay={-3.8}
            forceLookX={
              passwordLength > 0 && showPassword
                ? -4
                : isLookingAtEachOther
                  ? 0
                  : undefined
            }
            forceLookY={
              passwordLength > 0 && showPassword
                ? -4
                : isLookingAtEachOther
                  ? -4
                  : undefined
            }
          />
        </div>
      </div>

      {/* Orange semi-circle character - Front left */}
      <div
        ref={orangeRef}
        className='absolute bottom-0 transition-all duration-700 ease-in-out'
        style={{
          left: '0px',
          width: '240px',
          height: '200px',
          zIndex: 3,
          backgroundColor: '#FF9B6B',
          borderRadius: '120px 120px 0 0',
          transform:
            passwordLength > 0 && showPassword
              ? `skewX(0deg)`
              : 'skewX(var(--body-skew, 0deg))',
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes - just pupils, no white */}
        <div
          className='absolute flex gap-8 transition-all duration-200 ease-out'
          style={{
            left:
              passwordLength > 0 && showPassword
                ? `${50}px`
                : 'calc(82px + var(--face-x, 0px))',
            top:
              passwordLength > 0 && showPassword
                ? `${85}px`
                : 'calc(90px + var(--face-y, 0px))',
          }}
        >
          <Pupil
            size={12}
            maxDistance={5}
            pupilColor='#2D2D2D'
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
          <Pupil
            size={12}
            maxDistance={5}
            pupilColor='#2D2D2D'
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
        </div>
      </div>

      {/* Yellow tall rectangle character - Front right */}
      <div
        ref={yellowRef}
        className='absolute bottom-0 transition-all duration-700 ease-in-out'
        style={{
          left: '310px',
          width: '140px',
          height: '230px',
          backgroundColor: '#E8D754',
          borderRadius: '70px 70px 0 0',
          zIndex: 4,
          transform:
            passwordLength > 0 && showPassword
              ? `skewX(0deg)`
              : 'skewX(var(--body-skew, 0deg))',
          transformOrigin: 'bottom center',
        }}
      >
        {/* Eyes - just pupils, no white */}
        <div
          className='absolute flex gap-6 transition-all duration-200 ease-out'
          style={{
            left:
              passwordLength > 0 && showPassword
                ? `${20}px`
                : 'calc(52px + var(--face-x, 0px))',
            top:
              passwordLength > 0 && showPassword
                ? `${35}px`
                : 'calc(40px + var(--face-y, 0px))',
          }}
        >
          <Pupil
            size={12}
            maxDistance={5}
            pupilColor='#2D2D2D'
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
          <Pupil
            size={12}
            maxDistance={5}
            pupilColor='#2D2D2D'
            forceLookX={passwordLength > 0 && showPassword ? -5 : undefined}
            forceLookY={passwordLength > 0 && showPassword ? -4 : undefined}
          />
        </div>
        {/* Horizontal line for mouth */}
        <div
          className='absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out'
          style={{
            left:
              passwordLength > 0 && showPassword
                ? `${10}px`
                : 'calc(40px + var(--face-x, 0px))',
            top:
              passwordLength > 0 && showPassword
                ? `${88}px`
                : 'calc(88px + var(--face-y, 0px))',
          }}
        />
      </div>
    </div>
  );
}
