"use client";

import { useCustomerData } from "@shared/libs/data/customer-data-context";
import { i18n } from "@shared/libs/i18n";
import { useSidebarChatStore } from "@shared/libs/store/sidebar-chat-store";
import { cn } from "@shared/libs/utils";
import { motion } from "framer-motion";
import { CustomerStatsCard } from "@/features/dashboard/customer-stats-card";
import type { CustomerActivity } from "@/features/dashboard/types";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/shared/ui/hover-card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { Progress } from "@/shared/ui/progress";
import {
  CUSTOMER_CARD_STAGGER_DELAY_S,
  PERCENT_SCALE,
} from "../../dashboard/constants";
import type { UsePaginationReturn } from "../../hooks/usePagination";

type CustomerActivityListProps = {
  customers: CustomerActivity[];
  maxCustomers: number;
  customersPerPage: number;
  paginatedCustomers: CustomerActivity[];
  pagination: UsePaginationReturn;
  isLocalized: boolean;
};

export function CustomerActivityList({
  customers,
  maxCustomers,
  customersPerPage,
  paginatedCustomers,
  pagination,
  isLocalized,
}: CustomerActivityListProps) {
  const { customers: customerDirectory } = useCustomerData();
  const { openConversation } = useSidebarChatStore();

  const getCustomerName = (wa_id: string) => {
    const entry = customerDirectory.find((c) => c.phone === wa_id);
    return entry?.name || wa_id;
  };

  const handleCustomerClick = (wa_id: string) => {
    openConversation(wa_id);
  };

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      initial={{ opacity: 0, y: 20 }}
      transition={{ delay: 0.6 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>
            {i18n.getMessage("msg_most_active_customers", isLocalized)}{" "}
            {`(${maxCustomers})`}
          </CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge>
                {i18n.getMessage("msg_page", isLocalized)}{" "}
                {pagination.currentPageNumber}{" "}
                {i18n.getMessage("msg_of", isLocalized)} {pagination.totalPages}
              </Badge>
              <Badge>
                {customers.length} {i18n.getMessage("msg_total", isLocalized)}
              </Badge>
            </div>

            <div className="flex items-center space-x-1">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      className={cn(
                        pagination.currentPage === 0 &&
                          "pointer-events-none opacity-50"
                      )}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        pagination.handlePrevPage();
                      }}
                    />
                  </PaginationItem>

                  {Array.from({ length: pagination.totalPages }).map(
                    (_, idx) => {
                      const pageNumber = idx + 1;
                      const isActive = idx === pagination.currentPage;

                      if (
                        pagination.totalPages >
                        pagination.paginationConfig.maxSimplePages
                      ) {
                        if (
                          pageNumber === 1 ||
                          pageNumber === pagination.totalPages ||
                          Math.abs(pageNumber - pagination.currentPageNumber) <=
                            pagination.paginationConfig.neighborhoodDistance
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                href="#"
                                isActive={isActive}
                                onClick={(e) => {
                                  e.preventDefault();
                                  pagination.setCurrentPage(idx);
                                }}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }

                        if (
                          (pageNumber ===
                            pagination.paginationConfig.secondPageNumber &&
                            pagination.currentPageNumber >
                              pagination.paginationConfig.leadingWindowEnd) ||
                          (pageNumber ===
                            pagination.totalPages -
                              pagination.paginationConfig.penultimateOffset &&
                            pagination.currentPageNumber <
                              pagination.totalPages -
                                pagination.paginationConfig.trailingWindowStart)
                        ) {
                          return (
                            <PaginationItem key={`ellipsis-${pageNumber}`}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }

                        return null;
                      }

                      return (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            href="#"
                            isActive={isActive}
                            onClick={(e) => {
                              e.preventDefault();
                              pagination.setCurrentPage(idx);
                            }}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    }
                  )}

                  <PaginationItem>
                    <PaginationNext
                      className={cn(
                        pagination.currentPage >= pagination.totalPages - 1 &&
                          "pointer-events-none opacity-50"
                      )}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        pagination.handleNextPage();
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="max-h-[25rem] space-y-3 overflow-y-auto">
            {paginatedCustomers.map((customer, index) => {
              const globalIndex =
                pagination.currentPage * customersPerPage + index + 1;
              const initials = customer.wa_id
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(-2)
                .toUpperCase();

              return (
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  initial={{ opacity: 0, x: -20 }}
                  key={customer.wa_id}
                  transition={{
                    delay: index * CUSTOMER_CARD_STAGGER_DELAY_S,
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 font-medium text-muted-foreground text-sm">
                        #{globalIndex}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <HoverCard>
                        <HoverCardTrigger asChild>
                          <button
                            className="max-w-[11.25rem] cursor-pointer truncate border-none bg-transparent p-0 text-left font-medium text-sm hover:text-blue-600"
                            onClick={() => handleCustomerClick(customer.wa_id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleCustomerClick(customer.wa_id);
                              }
                            }}
                            type="button"
                          >
                            {getCustomerName(customer.wa_id)}
                          </button>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-[18.75rem] p-0">
                          <CustomerStatsCard
                            isHoverCard={true}
                            isLocalized={isLocalized}
                            selectedConversationId={customer.wa_id}
                          />
                        </HoverCardContent>
                      </HoverCard>
                      <p className="text-muted-foreground text-xs">
                        {i18n.getMessage("msg_last", isLocalized)}{" "}
                        {new Date(customer.lastActivity).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1 text-right">
                    <div className="flex items-center space-x-2">
                      <Badge className="text-xs">
                        {customer.messageCount}{" "}
                        {i18n.getMessage("msg_msgs", isLocalized)}
                      </Badge>
                      <Badge className="text-xs">
                        {customer.reservationCount}{" "}
                        {i18n.getMessage("msg_bookings", isLocalized)}
                      </Badge>
                    </div>
                    <Progress
                      className="h-1.5 w-20"
                      value={
                        (customer.messageCount /
                          Math.max(...customers.map((c) => c.messageCount))) *
                        PERCENT_SCALE
                      }
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
