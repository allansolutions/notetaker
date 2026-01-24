import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
} from './popover';

describe('Popover components', () => {
  it('renders popover trigger', () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );

    expect(screen.getByText('Open')).toBeInTheDocument();
  });

  it('shows content when opened', async () => {
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover Content</PopoverContent>
      </Popover>
    );

    fireEvent.click(screen.getByText('Open'));
    expect(await screen.findByText('Popover Content')).toBeInTheDocument();
  });

  it('renders PopoverAnchor', () => {
    render(
      <Popover>
        <PopoverAnchor data-testid="anchor">Anchor</PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>
    );

    expect(screen.getByTestId('anchor')).toBeInTheDocument();
  });

  it('applies custom className to content', async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent className="custom-class">Content</PopoverContent>
      </Popover>
    );

    const content = await screen.findByText('Content');
    expect(content).toHaveClass('custom-class');
  });
});
