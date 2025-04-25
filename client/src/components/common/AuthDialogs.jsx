import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'; // Assuming this path is correct
import { Mail, Lock, ArrowRight, Loader2, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Assuming this path is correct

// Login Dialog Component
const LoginDialog = ({ isOpen, onClose, onForgotPassword, onSignUp }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const { login } = useAuth();

  useEffect(() => {
    console.log('[LoginDialog] Component mounted/isOpen changed:', isOpen);
    // Reset state if dialog is reopened
    if (isOpen) {
        setEmail('');
        setPassword('');
        setShowPassword(false);
        setErrors({});
        setIsLoading(false);
    }
    return () => {
      console.log('[LoginDialog] Component unmounted');
    };
  }, [isOpen]); // Add isOpen dependency to reset state on reopen

  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format'; // Add basic email validation
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[LoginDialog] handleSubmit triggered.');
    if (!validateForm()) {
      console.log('[LoginDialog] Validation failed.');
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous submit errors
    console.log('[LoginDialog] Attempting login with email:', email);
    try {
      const response = await login(email, password);
      console.log('[LoginDialog] Login API response:', response);
      console.log('[LoginDialog] Login successful.');
      onClose(); // Close dialog on successful login
    } catch (error) {
      console.error('[LoginDialog] Login failed:', error);
      // Update error message for clarity
      setErrors({ submit: error.message || 'Login failed. Please check your credentials.' });
    } finally {
      console.log('[LoginDialog] Login attempt finished.');
      setIsLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    console.log('[LoginDialog] Email changed to:', newEmail);
    // Clear email error when user types
    if (errors.email) setErrors({ ...errors, email: '' });
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
     // Clear password error when user types
    if (errors.password) setErrors({ ...errors, password: '' });
  }

  const handleClose = () => {
    // Reset state before calling parent onClose
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setErrors({});
    setIsLoading(false);
    onClose();
  };

  return (
    // Use handleClose for onOpenChange to ensure state reset
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Welcome back</DialogTitle>
          <DialogDescription className="text-center">
            Sign in to your account to continue
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-4">
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Email"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                    errors.email ? 'border-red-500 ring-red-500' : 'border-gray-300'
                  }`}
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
              </div>
              {errors.email && <p id="email-error" className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={handlePasswordChange}
                  placeholder="Password"
                  className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                    errors.password ? 'border-red-500 ring-red-500' : 'border-gray-300'
                  }`}
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && <p id="password-error" className="text-red-500 text-sm mt-1">{errors.password}</p>}
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
             {/* Removed "Remember me" for simplicity, can be added back if needed */}
             <span></span> {/* Placeholder for alignment */}
            <button
              type="button"
              onClick={onForgotPassword} // Use the prop passed from parent
              className="font-medium text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              Forgot password?
            </button>
          </div>

          {errors.submit && (
            <p role="alert" className="text-red-500 text-sm text-center">{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-2.5 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

          <div className="text-center text-sm">
            <span className="text-gray-600">Don't have an account? </span>
            <button
              type="button"
              onClick={onSignUp} // Add onSignUp prop usage
              className="font-medium text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              Sign up
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Sign Up Dialog Component
const SignUpDialog = ({ isOpen, onClose, onLogin }) => { // Added onLogin prop
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const { register } = useAuth();

  useEffect(() => {
    console.log('[SignUpDialog] Component mounted/isOpen changed:', isOpen);
     // Reset state if dialog is reopened
    if (isOpen) {
        setFormData({ name: '', email: '', password: '', confirmPassword: '' });
        setShowPassword(false);
        setShowConfirmPassword(false);
        setErrors({});
        setIsLoading(false);
    }
    return () => {
      console.log('[SignUpDialog] Component unmounted');
    };
  }, [isOpen]); // Add isOpen dependency

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'; // Example validation
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    console.log('[SignUpDialog] Validation result:', Object.keys(newErrors).length === 0, 'Errors:', newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[SignUpDialog] handleSubmit triggered.');
    if (!validateForm()) {
      console.log('[SignUpDialog] Form validation failed.');
      return;
    }

    setIsLoading(true);
    setErrors({}); // Clear previous submit errors
    const registrationData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      password: formData.password,
      // Assuming backend derives username or handles it separately
    };
    console.log('[SignUpDialog] Attempting registration with data:', { name: registrationData.name, email: registrationData.email });

    try {
      const response = await register(registrationData);
      console.log('[SignUpDialog] Registration API response:', response);
      console.log('[SignUpDialog] Registration successful.');
      onClose(); // Close dialog on successful registration
       // Optionally: Show a success message or redirect
    } catch (error) {
      console.error('[SignUpDialog] Registration failed:', error);
       // Update error message for clarity
      setErrors({ submit: error.message || 'Sign up failed. Email might already be in use.' });
    } finally {
      console.log('[SignUpDialog] Registration attempt finished.');
      setIsLoading(false);
    }
  };

  const handleFormChange = (fieldName, value) => {
    setFormData({ ...formData, [fieldName]: value });
    console.log(`[SignUpDialog] ${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} changed`);
    // Clear validation error for the specific field when user types
    if (errors[fieldName]) setErrors({ ...errors, [fieldName]: '' });
    // If changing password, also clear confirm password mismatch error
    if (fieldName === 'password' && errors.confirmPassword === 'Passwords do not match') {
        setErrors({ ...errors, confirmPassword: '' });
    }
  };

  const handleClose = () => {
    // Reset state before calling parent onClose
    setFormData({ name: '', email: '', password: '', confirmPassword: '' });
    setShowPassword(false);
    setShowConfirmPassword(false);
    setErrors({});
    setIsLoading(false);
    onClose();
  };


  return (
     // Use handleClose for onOpenChange to ensure state reset
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Create an account</DialogTitle>
          <DialogDescription className="text-center">
            Join us to start exploring
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="Full Name"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.name ? 'border-red-500 ring-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "name-error" : undefined}
              />
            </div>
            {errors.name && <p id="name-error" className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFormChange('email', e.target.value)}
                placeholder="Email"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.email ? 'border-red-500 ring-red-500' : 'border-gray-300'
                }`}
                 aria-invalid={!!errors.email}
                 aria-describedby={errors.email ? "email-error-signup" : undefined}
              />
            </div>
            {errors.email && <p id="email-error-signup" className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleFormChange('password', e.target.value)}
                placeholder="Password (min 6 characters)"
                className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.password ? 'border-red-500 ring-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error-signup" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && <p id="password-error-signup" className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => handleFormChange('confirmPassword', e.target.value)}
                placeholder="Confirm Password"
                className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                  errors.confirmPassword ? 'border-red-500 ring-red-500' : 'border-gray-300'
                }`}
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p id="confirm-password-error" className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.submit && (
            <p role="alert" className="text-red-500 text-sm text-center">{errors.submit}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-green-500 text-white py-2.5 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>

           <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <button
              type="button"
              onClick={onLogin} // Use the prop passed from parent
              className="font-medium text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              Sign In
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};


// Forgot Password Dialog Component
const ForgotPasswordDialog = ({ isOpen, onClose, onBackToLogin }) => { // Added onBackToLogin prop
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('[ForgotPasswordDialog] Component mounted/isOpen changed:', isOpen);
     // Reset state if dialog is reopened
    if (isOpen) {
      setEmail('');
      setIsSubmitted(false);
      setError('');
      setIsLoading(false);
    }
    return () => {
      console.log('[ForgotPasswordDialog] Component unmounted');
    };
  }, [isOpen]); // Add isOpen dependency

  const validateEmail = (emailToValidate) => {
    if (!emailToValidate.trim()) {
      setError('Email is required');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToValidate)) {
      setError('Please enter a valid email address');
      return false;
    }
    setError(''); // Clear error if valid
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[ForgotPasswordDialog] handleSubmit triggered.');

    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);
    setError(''); // Clear previous errors

    try {
      // Make API call to backend forgot password endpoint
      console.log('[ForgotPasswordDialog] Sending request for email:', email);
      const response = await fetch('/api/auth/forgot-password', { // Make sure this endpoint is correct
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Use error message from backend if available, otherwise use a generic one
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      console.log('[ForgotPasswordDialog] Password reset email sent successfully to:', email);
      setIsSubmitted(true); // Show success state
    } catch (err) {
      console.error('[ForgotPasswordDialog] Password reset request failed:', err);
      // Set a user-friendly error message
      setError(err.message || 'Failed to send reset link. Please check the email or try again later.');
    } finally {
      setIsLoading(false);
      console.log('[ForgotPasswordDialog] Password reset attempt finished.');
    }
  };

  const handleClose = () => {
    // Reset state before calling parent onClose
    setIsSubmitted(false);
    setEmail('');
    setError('');
    setIsLoading(false);
    onClose(); // Call the original onClose passed as prop
  };

  const handleEmailInputChange = (e) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    // Clear error message when user starts typing
    if (error) setError('');
    console.log('[ForgotPasswordDialog] Email changed to:', newEmail);
  };


  return (
    // Use handleClose for onOpenChange to ensure state reset
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Reset your password</DialogTitle>
          <DialogDescription className="text-center px-4">
            {isSubmitted
              ? "We've sent a password reset link to your email address."
              : "Enter your email address and we'll send you a link to reset your password."
            }
          </DialogDescription>
        </DialogHeader>
        {!isSubmitted ? (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4 px-6 pb-6"> {/* Add padding */}
            <div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="email"
                  value={email}
                  onChange={handleEmailInputChange}
                  placeholder="Email address"
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 ${
                    error ? 'border-red-500 ring-red-500' : 'border-gray-300'
                   }`}
                  required
                  aria-invalid={!!error}
                  aria-describedby={error ? "forgot-email-error" : undefined}
                />
              </div>
              {error && <p id="forgot-email-error" className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-500 text-white py-2.5 rounded-lg font-semibold hover:bg-green-600 transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={onBackToLogin} // Use the prop passed from parent
                className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors duration-200"
              >
                Back to login
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 mb-6 text-center px-6">
             {/* Optional: Add an icon for success */}
            <p className="text-gray-700 mb-6">If an account exists for <span className="font-medium">{email}</span>, you will receive an email with instructions on how to reset your password shortly. Please check your inbox (and spam folder).</p>
            <button
              onClick={handleClose} // Use the internal handleClose to reset state
              className="text-sm font-medium text-green-600 hover:text-green-700 transition-colors duration-200"
            >
              Close
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export { LoginDialog, SignUpDialog, ForgotPasswordDialog };