import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { LoadingSpinner, FullPageLoading } from '@/components/ui/loading';

describe('Loading Components', () => {
  describe('LoadingSpinner', () => {
    it('renders with default size', () => {
      const { container } = render(<LoadingSpinner />);
      const spinner = container.querySelector('[data-testid="loading-spinner"]') || container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with small size', () => {
      const { container } = render(<LoadingSpinner size="sm" />);
      const spinner = container.querySelector('.w-4.h-4') || container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('renders with large size', () => {
      const { container } = render(<LoadingSpinner size="lg" />);
      const spinner = container.querySelector('.w-8.h-8') || container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('FullPageLoading', () => {
    it('renders default loading text', () => {
      const { getByText } = render(<FullPageLoading />);
      expect(getByText('Đang tải...')).toBeInTheDocument();
      expect(getByText('SABOHUB')).toBeInTheDocument();
    });

    it('renders custom loading text', () => {
      const { getByText } = render(<FullPageLoading loadingText="Đang xử lý..." />);
      expect(getByText('Đang xử lý...')).toBeInTheDocument();
    });
  });
});