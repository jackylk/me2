'use client';

import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = currentPage * pageSize + 1;
  const endItem = Math.min((currentPage + 1) * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3 sm:px-6 rounded-lg">
      {/* 左侧：显示范围 */}
      <div className="flex flex-1 justify-between sm:hidden">
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
        >
          上一页
        </Button>
        <Button
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages - 1}
        >
          下一页
        </Button>
      </div>

      {/* 桌面版 */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-foreground">
            显示 <span className="font-medium">{startItem}</span> 到{' '}
            <span className="font-medium">{endItem}</span> 条，共{' '}
            <span className="font-medium">{totalItems}</span> 条
          </p>
        </div>
        <div>
          <nav
            className="isolate inline-flex -space-x-px rounded-md shadow-sm"
            aria-label="Pagination"
          >
            {/* 上一页 */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
              className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground bg-card ring-1 ring-inset ring-border hover:bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">上一页</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* 页码 */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i;
              } else if (currentPage < 4) {
                pageNum = i;
              } else if (currentPage >= totalPages - 4) {
                pageNum = totalPages - 7 + i;
              } else {
                pageNum = currentPage - 3 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    currentPage === pageNum
                      ? 'z-10 bg-primary text-primary-foreground focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
                      : 'bg-card text-foreground ring-1 ring-inset ring-border hover:bg-secondary focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {pageNum + 1}
                </button>
              );
            })}

            {/* 下一页 */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground bg-card ring-1 ring-inset ring-border hover:bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="sr-only">下一页</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
