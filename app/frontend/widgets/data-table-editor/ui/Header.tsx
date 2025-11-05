"use client";
import { X } from "lucide-react";

type HeaderProps = {
  title: string;
  subTitle?: string;
  onClose: () => void;
};

export function Header({ title, subTitle, onClose }: HeaderProps) {
  return (
    <div className="flex flex-row items-center justify-between border-b px-4 py-1.5">
      <div className="flex flex-col space-y-1.5">
        <h2
          className={
            "py-2 text-left font-semibold text-xl leading-none tracking-tight"
          }
        >
          {title}
          {subTitle ? <> - {subTitle}</> : null}
        </h2>
      </div>
      <button
        className="flex-shrink-0 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
        onClick={onClose}
        type="button"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </div>
  );
}
