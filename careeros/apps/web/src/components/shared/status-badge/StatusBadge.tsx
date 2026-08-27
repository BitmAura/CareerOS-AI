"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      status: {
        applied: "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        shortlisted: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
        interview: "border-transparent bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
        offer: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        rejected: "border-transparent bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        pending: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        active: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        inactive: "border-transparent bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
      },
    },
    defaultVariants: {
      status: "pending",
    },
  }
);

interface StatusBadgeProps extends VariantProps<typeof statusVariants> {
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span className={cn(statusVariants({ status }), className)}>
      {children}
    </span>
  );
}
