import React from "react";
import { Menu } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface DropdownItem {
  label: string;
  value: string;
  href?: string;
  icon?: React.ReactNode;
}

interface DropdownProps {
  items: DropdownItem[];
  width?: string;
  buttonText?: string;
  className?: string;
  variant?: "default" | "no-icons";
  value?: string;
  onChange?: (value: string) => void;
}

const DropDown: React.FC<DropdownProps> = ({
  items,
  width = "200px",
  buttonText = "Select Option",
  className = "",
  variant = "default",
  value,
  onChange,
}) => {
  const dropdownAnimation = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      y: -10,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.2,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      scale: 0.95,
      y: -10,
      transition: {
        duration: 0.15,
        ease: "easeIn",
      },
    },
  };

  const itemAnimation = {
    hidden: { opacity: 0, x: -10 },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.2,
      },
    }),
  };

  const rotateAnimation = {
    open: { rotate: 180 },
    closed: { rotate: 0 },
  };

  const selectedItem = items.find((item) => item.value === value);
  const displayText = selectedItem ? selectedItem.label : buttonText;

  const handleItemClick = (
    e: React.MouseEvent,
    close: () => void,
    value: string,
    href?: string
  ) => {
    e.preventDefault();
    onChange?.(value);
    close();
    if (href) {
      window.location.href = href;
    }
  };

  return (
    <Menu as="div" className={cn("relative inline-block text-left", className)}>
      {({ open, close }) => (
        <>
          <Menu.Button
            className={cn(
              "inline-flex w-full items-center justify-between gap-x-2 rounded-lg",
              "bg-white dark:bg-gray-800 px-4 py-2.5 text-sm font-medium",
              "text-gray-900 dark:text-white shadow-sm ring-1 ring-inset",
              "ring-gray-300 dark:ring-gray-700",
              "hover:bg-gray-50 dark:hover:bg-gray-700",
              "transition-all duration-200 ease-in-out",
              "focus:outline-none focus:ring-2 focus:ring-blue-500"
            )}
          >
            <span className="truncate">{displayText}</span>
            <motion.div
              animate={open ? "open" : "closed"}
              variants={rotateAnimation}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="h-4 w-4" />
            </motion.div>
          </Menu.Button>

          <AnimatePresence>
            {open && (
              <Menu.Items
                as={motion.div}
                static
                initial="hidden"
                animate="visible"
                exit="exit"
                variants={dropdownAnimation}
                className={cn(
                  "absolute right-0 z-10 mt-2 origin-top-right rounded-lg",
                  "bg-white dark:bg-gray-800 shadow-lg",
                  "ring-1 ring-black ring-opacity-5",
                  "focus:outline-none overflow-hidden",
                  `w-[${width}]`
                )}
              >
                <div className="py-1">
                  {items.map((item, index) => (
                    <Menu.Item key={index}>
                      {({ active }) => (
                        <motion.div
                          custom={index}
                          initial="hidden"
                          animate="visible"
                          variants={itemAnimation}
                        >
                          <Link
                            href={item.href || "#"}
                            onClick={(e) =>
                              handleItemClick(e, close, item.value, item.href)
                            }
                            className={cn(
                              "group flex items-center px-4 py-2.5 text-sm",
                              "transition-colors duration-150 ease-in-out",
                              "hover:bg-blue-50 dark:hover:bg-gray-700",
                              "hover:text-blue-600 dark:hover:text-white",
                              {
                                "bg-blue-50 dark:bg-gray-700 text-blue-600 dark:text-white":
                                  active || item.value === value,
                                "text-gray-700 dark:text-gray-200":
                                  !active && item.value !== value,
                              }
                            )}
                          >
                            {variant === "default" && item.icon && (
                              <span className="mr-3 h-5 w-5">{item.icon}</span>
                            )}
                            <span className="flex-1">{item.label}</span>
                            {item.value === value && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="ml-2 h-4 w-4 text-blue-600 dark:text-white"
                              >
                                <svg viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </motion.div>
                            )}
                          </Link>
                        </motion.div>
                      )}
                    </Menu.Item>
                  ))}
                </div>
              </Menu.Items>
            )}
          </AnimatePresence>
        </>
      )}
    </Menu>
  );
};

export default DropDown;
