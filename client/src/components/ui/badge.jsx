import * as React from "react"

const Badge = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 border-transparent bg-gray-900 text-gray-50 hover:bg-gray-900/80"
      {...props}
    >
      {children}
    </div>
  )
})
Badge.displayName = "Badge"

export { Badge }