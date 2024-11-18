import * as React from "react";
import { cva } from "class-variance-authority";

const dialogOverlayVariants = cva(
  "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  {
    variants: {},
    defaultVariants: {},
  }
);

const dialogContentVariants = cva(
  "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
  {
    variants: {
      size: {
        default: "max-w-lg",
        sm: "max-w-sm",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-full",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const Dialog = ({ open, onOpenChange, children }) => {
  const [isOpen, setIsOpen] = React.useState(open || false);

  React.useEffect(() => {
    if (open !== undefined) {
      setIsOpen(open);
    }
  }, [open]);

  const handleOpenChange = (newOpen) => {
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <div 
            className={dialogOverlayVariants()}
            onClick={() => handleOpenChange(false)}
          />
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child, { 
                open: isOpen,
                onOpenChange: handleOpenChange,
              });
            }
            return child;
          })}
        </div>
      )}
    </>
  );
};

const DialogTrigger = React.forwardRef(({ className, children, asChild = false, ...props }, ref) => {
  const Comp = asChild ? React.Children.only(children).type : "button";
  return (
    <Comp
      ref={ref}
      className={className}
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        props.onOpenChange?.(true);
      }}
    >
      {asChild ? React.Children.only(children).props.children : children}
    </Comp>
  );
});
DialogTrigger.displayName = "DialogTrigger";

const DialogContent = React.forwardRef(({ 
  className,
  children,
  size,
  onClose,
  ...props 
}, ref) => {
  return (
    <div
      ref={ref}
      className={dialogContentVariants({ size, className })}
      {...props}
    >
      {children}
      <button
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
        onClick={() => props.onOpenChange?.(false)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
        >
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
});
DialogContent.displayName = "DialogContent";

const DialogHeader = ({ className, children, ...props }) => (
  <div
    className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}
    {...props}
  >
    {children}
  </div>
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef(({ className, children, ...props }, ref) => (
  <h2
    ref={ref}
    className={`text-lg font-semibold leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h2>
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={`text-sm text-muted-foreground ${className}`}
    {...props}
  >
    {children}
  </p>
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
};