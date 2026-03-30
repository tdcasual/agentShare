'use client';

import * as React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
  icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helper, icon, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#9CA3AF]">
              {icon}
            </div>
          )}
          <input
            type={type}
            className={cn(
              'w-full rounded-2xl border-2 bg-white px-4 py-3 text-base outline-none transition-all duration-200',
              'placeholder:text-gray-400 dark:text-[#9CA3AF]',
              'focus:border-pink-400 focus:ring-4 focus:ring-pink-100',
              error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
              icon && 'pl-12',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
        {helper && !error && (
          <p className="mt-1.5 text-sm text-gray-500 dark:text-[#9CA3AF]">{helper}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string }>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-[#E8E8EC] mb-1.5">
            {label}
          </label>
        )}
        <textarea
          className={cn(
            'w-full rounded-2xl border-2 border-pink-200 bg-white px-4 py-3 text-base outline-none transition-all duration-200 resize-none',
            'placeholder:text-gray-400 dark:text-[#9CA3AF]',
            'focus:border-pink-400 focus:ring-4 focus:ring-pink-100',
            error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Input, Textarea };
