import { render, screen } from '@testing-library/react';
import App from './App';

test('renders trainer title and stats', () => {
  render(<App />);
  expect(screen.getByText(/مُدرِّب جداول الضرب/)).toBeInTheDocument();
  expect(screen.getByText(/سجل الإجابات/)).toBeInTheDocument();
  expect(screen.getByText(/الإجمالي/)).toBeInTheDocument();
});
