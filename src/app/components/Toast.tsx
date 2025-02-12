import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'error' | 'success';
  onClose: () => void;
}

export default function Toast({ message, type = 'error', onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';

  return (
    <div
      className={`fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in`}>
      <div className='flex items-center space-x-2'>
        <span>{message}</span>
        <button onClick={onClose} className='ml-2 hover:text-gray-200 transition-colors'>
          ×
        </button>
      </div>
    </div>
  );
}
