import React from 'react';
import './Pagination.css';

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage = 10,
  totalItems = 0,
  showPageInfo = true,
  maxVisiblePages = 5
}) => {
  // Don't render pagination if there's only one page or no items
  if (totalPages <= 1) {
    return null;
  }

  // Calculate the range of page numbers to display
  const getVisiblePages = () => {
    const pages = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const handlePreviousClick = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextClick = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className="pagination-container">
      <div className="pagination">
        {/* Previous Button */}
        <button
          className={`pagination-btn prev-btn ${currentPage === 1 ? 'disabled' : ''}`}
          onClick={handlePreviousClick}
          disabled={currentPage === 1}
          aria-label="Go to previous page"
        >
          <img src="/picture/left-arrow.png" alt="" className="pagination-icon" />
          Previous
        </button>

        {/* First page and ellipsis if needed */}
        {visiblePages[0] > 1 && (
          <>
            <button
              className="pagination-btn page-number"
              onClick={() => handlePageClick(1)}
            >
              1
            </button>
            {visiblePages[0] > 2 && (
              <span className="pagination-ellipsis">...</span>
            )}
          </>
        )}

        {/* Visible page numbers */}
        {visiblePages.map(page => (
          <button
            key={page}
            className={`pagination-btn page-number ${currentPage === page ? 'active' : ''}`}
            onClick={() => handlePageClick(page)}
            aria-label={`Go to page ${page}`}
          >
            {page}
          </button>
        ))}

        {/* Last page and ellipsis if needed */}
        {visiblePages[visiblePages.length - 1] < totalPages && (
          <>
            {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
              <span className="pagination-ellipsis">...</span>
            )}
            <button
              className="pagination-btn page-number"
              onClick={() => handlePageClick(totalPages)}
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next Button */}
        <button
          className={`pagination-btn next-btn ${currentPage === totalPages ? 'disabled' : ''}`}
          onClick={handleNextClick}
          disabled={currentPage === totalPages}
          aria-label="Go to next page"
        >
          Next
          <img src="/picture/right-arrow.png" alt="" className="pagination-icon" />
        </button>
      </div>
      
      {/* Page Information */}
      {showPageInfo && totalItems > 0 && (
        <div className="page-info">
          Showing {startItem} to {endItem} of {totalItems} results
        </div>
      )}
    </div>
  );
};

export default Pagination;
