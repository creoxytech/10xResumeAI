import React from 'react';

export const Card = ({ className = '', children, ...props }) => {
    return (
        <div
            className={`rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-50 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ className = '', children, ...props }) => (
    <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
        {children}
    </div>
);

export const CardTitle = ({ className = '', children, ...props }) => (
    <h3 className={`font-semibold leading-none tracking-tight ${className}`} {...props}>
        {children}
    </h3>
);

export const CardContent = ({ className = '', children, ...props }) => (
    <div className={`p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);

export const CardFooter = ({ className = '', children, ...props }) => (
    <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
        {children}
    </div>
);
