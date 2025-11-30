import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { SocialLoginButtons } from './SocialLoginButtons';

export const AuthModal = ({ open, onOpenChange, onSuccess }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Welcome to Deals247
          </DialogTitle>
          <p className="text-center text-gray-600 text-sm mt-2">
            Sign in to save deals and get personalized recommendations
          </p>
        </DialogHeader>

        <div className="mt-6">
          <SocialLoginButtons
            onSuccess={onSuccess}
            onClose={() => onOpenChange(false)}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};