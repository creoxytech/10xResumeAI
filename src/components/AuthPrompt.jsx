import React from 'react';
import Button from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";

export default function AuthPrompt({ onLogin }) {
  return (
    <Card className="max-w-md w-full mx-auto mt-20 shadow-2xl shadow-indigo-500/10 border-indigo-100 dark:border-indigo-900/30 dark:shadow-indigo-900/20 animate-slide-up">
      <CardHeader className="text-center space-y-3 pb-8">
        <div className="mx-auto w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mb-2 ring-1 ring-indigo-100 dark:ring-indigo-800">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-indigo-600 dark:text-indigo-400">
            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" />
          </svg>
        </div>
        <CardTitle className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">
          10xResumeAi
        </CardTitle>
        <p className="text-muted text-base">
          Your intelligent workspace for crafting the perfect resume.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onLogin} className="w-full h-12 text-lg shadow-indigo-500/25 hover:shadow-indigo-500/40" size="lg">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </Button>
        <p className="text-xs text-center text-muted">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </CardContent>
    </Card>
  );
}
