"use client";

import { i18n } from "@shared/libs/i18n";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  ChevronRight,
  Clock,
  Copy,
  EyeOff,
  Filter,
  Hash,
  Link,
  Mail,
  Palette,
  Pin,
  PinOff,
  Type,
} from "lucide-react";
import { useEffect, useState } from "react";

const MENU_VIEWPORT_MARGIN_X = 220;
const MENU_VIEWPORT_MARGIN_Y = 300;

type EnhancedColumnMenuProps = {
  isOpen: boolean;
  x: number;
  y: number;
  columnId: string;
  columnTitle: string;
  columnType?: string;
  isPinned?: boolean;
  isLocalized?: boolean;
  onClose: () => void;
  onSort?: (direction: "asc" | "desc") => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onHide?: () => void;
  onAutosize?: () => void;
  onCopy?: () => void;
  onFilter?: () => void;
  onFormat?: () => void;
  // Optional localization
  labels?: {
    sortAsc?: string;
    sortDesc?: string;
    pin?: string;
    unpin?: string;
    hide?: string;
    autosize?: string;
    copy?: string;
    filter?: string;
    format?: string;
    textFormat?: string;
    numberFormat?: string;
    dateFormat?: string;
  };
};

/**
 * Enhanced column menu with sorting, pinning, filtering, and formatting options
 * Fully generic and reusable for any grid implementation
 */
export function EnhancedColumnMenu({
  isOpen,
  x,
  y,
  columnId: _columnId,
  columnTitle,
  columnType = "text",
  isPinned = false,
  isLocalized,
  onClose,
  onSort,
  onPin,
  onUnpin,
  onHide,
  onAutosize,
  onCopy,
  onFilter,
  onFormat,
  labels = {},
}: EnhancedColumnMenuProps) {
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const _isLocalized = isLocalized ?? false;

  // Default labels
  const defaultLabels = {
    sortAsc: i18n.getMessage("cm_sort_asc", _isLocalized),
    sortDesc: i18n.getMessage("cm_sort_desc", _isLocalized),
    pin: i18n.getMessage("cm_pin_column", _isLocalized),
    unpin: i18n.getMessage("column_menu_unpin", _isLocalized),
    hide: i18n.getMessage("cm_hide_column", _isLocalized),
    autosize: i18n.getMessage("cm_autosize_column", _isLocalized),
    copy: i18n.getMessage("column_menu_copy", _isLocalized),
    filter: i18n.getMessage("column_menu_filter", _isLocalized),
    format: i18n.getMessage("cm_format", _isLocalized),
    textFormat: i18n.getMessage("column_menu_text_format", _isLocalized),
    numberFormat: i18n.getMessage("column_menu_number_format", _isLocalized),
    dateFormat: i18n.getMessage("column_menu_date_format", _isLocalized),
    ...labels,
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-enhanced-column-menu]")) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Prevent scrolling while menu is open
    const preventScroll = (e: WheelEvent | TouchEvent) => {
      e.preventDefault();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    document.addEventListener("wheel", preventScroll, { passive: false });
    document.addEventListener("touchmove", preventScroll, { passive: false });

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("wheel", preventScroll);
      document.removeEventListener("touchmove", preventScroll);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const getColumnIcon = () => {
    switch (columnType?.toLowerCase()) {
      case "date":
        return <Calendar className="h-4 w-4" />;
      case "time":
        return <Clock className="h-4 w-4" />;
      case "number":
        return <Hash className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "url":
      case "link":
        return <Link className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  const menuItems = [
    // Sorting section
    ...(onSort
      ? [
          {
            id: "sort-asc",
            label: defaultLabels.sortAsc,
            icon: <ArrowUp className="h-4 w-4" />,
            onClick: () => {
              onSort("asc");
              onClose();
            },
            section: "sort",
          },
          {
            id: "sort-desc",
            label: defaultLabels.sortDesc,
            icon: <ArrowDown className="h-4 w-4" />,
            onClick: () => {
              onSort("desc");
              onClose();
            },
            section: "sort",
          },
        ]
      : []),

    // Column management section
    ...(onPin || onUnpin
      ? [
          {
            id: "pin",
            label: isPinned ? defaultLabels.unpin : defaultLabels.pin,
            icon: isPinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            ),
            onClick: () => {
              if (isPinned && onUnpin) {
                onUnpin();
              } else if (!isPinned && onPin) {
                onPin();
              }
              onClose();
            },
            section: "column",
          },
        ]
      : []),

    ...(onAutosize
      ? [
          {
            id: "autosize",
            label: defaultLabels.autosize,
            icon: <ArrowUpDown className="h-4 w-4" />,
            onClick: () => {
              onAutosize();
              onClose();
            },
            section: "column",
          },
        ]
      : []),

    ...(onHide
      ? [
          {
            id: "hide",
            label: defaultLabels.hide,
            icon: <EyeOff className="h-4 w-4" />,
            onClick: () => {
              onHide();
              onClose();
            },
            section: "column",
          },
        ]
      : []),

    // Advanced actions (conditional)
    ...(onCopy
      ? [
          {
            id: "copy",
            label: defaultLabels.copy,
            icon: <Copy className="h-4 w-4" />,
            onClick: () => {
              onCopy();
              onClose();
            },
            section: "actions",
          },
        ]
      : []),

    ...(onFilter
      ? [
          {
            id: "filter",
            label: defaultLabels.filter,
            icon: <Filter className="h-4 w-4" />,
            onClick: () => {
              onFilter();
              onClose();
            },
            section: "actions",
          },
        ]
      : []),

    ...(onFormat
      ? [
          {
            id: "format",
            label: defaultLabels.format,
            icon: <Palette className="h-4 w-4" />,
            onClick: () => setShowFormatMenu(!showFormatMenu),
            hasSubmenu: true,
            section: "actions",
          },
        ]
      : []),
  ];

  // Group menu items by section
  const groupedItems = menuItems.reduce(
    (acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section]?.push(item);
      return acc;
    },
    {} as Record<string, typeof menuItems>
  );

  const sections = Object.entries(groupedItems).filter(
    ([_, items]) => items.length > 0
  );

  return (
    <div
      className="enhanced-column-menu-wrapper fixed inset-0"
      data-enhanced-column-menu
    >
      {/* Backdrop */}
      <button
        aria-label="Close menu overlay"
        className="absolute inset-0"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
        type="button"
      />

      {/* Menu */}
      <div
        className="enhanced-column-menu"
        style={
          {
            "--gdg-menu-right": `${Math.max(window.innerWidth - x, MENU_VIEWPORT_MARGIN_X)}px`,
            "--gdg-menu-top": `${Math.min(y, window.innerHeight - MENU_VIEWPORT_MARGIN_Y)}px`,
          } as React.CSSProperties
        }
      >
        {/* Header */}
        <div className="enhanced-column-menu-header">
          {getColumnIcon()}
          <span className="enhanced-column-menu-title">{columnTitle}</span>
        </div>

        {/* Menu sections */}
        <div className="enhanced-column-menu-section">
          {sections.map(([section, items], sectionIndex) => (
            <div key={section}>
              {sectionIndex > 0 && (
                <div className="enhanced-column-menu-divider" />
              )}

              {items.map((item) => (
                <button
                  className={`enhanced-column-menu-item ${item.hasSubmenu ? "has-submenu" : ""}`}
                  key={item.id}
                  onClick={item.onClick}
                  type="button"
                >
                  <div className="enhanced-column-menu-item-content">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.hasSubmenu && <ChevronRight className="h-4 w-4" />}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Format submenu */}
        {showFormatMenu && onFormat && (
          <div className="enhanced-column-menu-submenu">
            <div className="enhanced-column-menu-submenu-section">
              <button
                className="enhanced-column-menu-submenu-button"
                onClick={() => {
                  onFormat();
                  onClose();
                }}
                type="button"
              >
                {defaultLabels.textFormat}
              </button>
              <button
                className="enhanced-column-menu-submenu-button"
                onClick={() => {
                  onFormat();
                  onClose();
                }}
                type="button"
              >
                {defaultLabels.numberFormat}
              </button>
              <button
                className="enhanced-column-menu-submenu-button"
                onClick={() => {
                  onFormat();
                  onClose();
                }}
                type="button"
              >
                {defaultLabels.dateFormat}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
