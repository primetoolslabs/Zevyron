import clsx from "clsx"

type ButtonSize = "sm" | "md" | "lg"
type ButtonVariant = "primary" | "outline" | "secondary" | "danger" | ""

const sizes: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-5 py-3 text-lg",
}

interface ButtonProps {
  children: React.ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  disabled?: boolean
  as?: React.ElementType
  [key: string]: any
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "sm",
  className = "",
  disabled = false,
  as = "button",
  ...props
}) => {
  const base =
    "flex items-center rounded-lg font-medium transition-all duration-200 select-none focus:outline-hidden active:scale-90"

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-zevyron-primary text-white hover:brightness-110 border-zevyron-secondary hover:bg-zevyron-secondary hover:border-zevyron-primary",
    outline:
      "border border-zevyron-primary text-zevyron-primary hover:bg-zevyron-primary hover:text-white",
    secondary:
      "bg-zevyron-card border border-zevyron-secondary text-zevyron-text hover:bg-zevyron-secondary hover:border-zevyron-card",
    danger:
      "bg-red-600 text-white border border-red-700 hover:bg-red-700 hover:border-red-800 focus:ring-red-500",
    "": "",
  }

  const disabledClasses = "opacity-50 cursor-not-allowed pointer-events-none"

  return (
    <button
      className={clsx(
        base,
        sizes[size as ButtonSize],
        variants[variant as ButtonVariant],
        disabled ? disabledClasses : "",
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export default Button
