'use client';
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface AnimatedInputProps {
  id: string;
  type: string;
  placeholder: string;
  label: string;
  icon: LucideIcon;
  iconDelay?: number;
  fieldDelay?: number;
  required?: boolean;
  children?: React.ReactNode;
  /** Controlled value — pass this + onChange to manage form state */
  value?: string;
  /** Called when the input value changes */
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Per-field error message (e.g. from API validation) */
  error?: string;
}

export function AnimatedInput({
  id,
  type,
  placeholder,
  label,
  icon: Icon,
  iconDelay = 0,
  fieldDelay = 0,
  required = false,
  children,
  value,
  onChange,
  error,
}: AnimatedInputProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: fieldDelay }}
    >
      <label htmlFor={id} className="block text-foreground mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative flex items-center">
        <motion.div
          className="absolute left-4 size-5 text-foreground/40 flex items-center justify-center"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 5,
            delay: iconDelay,
          }}
        >
          <Icon className="size-5" />
        </motion.div>
        {children ? (
          <div className="w-full pl-12">
            {children}
          </div>
        ) : (
          <motion.input
            id={id}
            type={type}
            placeholder={placeholder}
            required={required}
            value={value}
            onChange={onChange}
            className={`w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl border ${
              error
                ? "border-red-400 focus:ring-red-500 focus:border-red-500"
                : "border-border focus:ring-blue-500 focus:border-blue-500"
            } focus:outline-none focus:ring-2 focus:shadow-blue-100 transition-all duration-200`}
            whileFocus={{ 
              scale: 1.01
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          />
        )}
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">{error}</p>
      )}
    </motion.div>
  );
}
