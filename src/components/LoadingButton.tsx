// src/components/LoadingButton.tsx
import React, { useState } from 'react';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClick?: () => Promise<void> | void;
  loadingText?: string;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  onClick,
  children,
  loadingText = 'Carregando...',
  disabled,
  type = 'button',
  ...rest
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (type === 'submit') return; // para forms, deixa o submit funcionar normalmente
    if (isLoading || disabled) return;

    try {
      setIsLoading(true);
      await onClick?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type={type}
      {...rest}
      onClick={handleClick}
      disabled={isLoading || disabled}
      className={`btn ${rest.className || ''}`}
    >
      {isLoading ? (
        <>
          <span className="spinner-border spinner-border-sm me-2" role="status" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default LoadingButton;
