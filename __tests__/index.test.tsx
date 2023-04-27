import { render, screen } from '@testing-library/react';
import Home from '@/pages/index';
import '@testing-library/jest-dom';

jest.mock('next/router', () => require('next-router-mock'));

describe('Home', () => {
  it('renders the heading', () => {
    render(<Home loggedIn={false} />);

    const heading = screen.getByRole('heading', { name: 'Welcome to my super secret website.' });

    expect(heading).toBeInTheDocument();
  });
});
