import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import NotFound from '@/pages/NotFound';

// Test utility wrapper
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('NotFound Page', () => {
  it('renders 404 heading', () => {
    render(<NotFound />, { wrapper: TestWrapper });
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<NotFound />, { wrapper: TestWrapper });
    expect(screen.getByText('Trang Không Tồn Tại')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<NotFound />, { wrapper: TestWrapper });
    expect(screen.getByRole('button', { name: /về trang chủ/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /quay lại/i })).toBeInTheDocument();
  });
});