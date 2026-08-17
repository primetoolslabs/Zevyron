import { cn } from "@/lib/utils"

function Card({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "bg-zevyron-card border border-zevyron-border rounded-xl hover:border-zevyron-primary transition group",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
