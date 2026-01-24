import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './select';

describe('Select components', () => {
  it('renders Select with trigger and value', () => {
    render(
      <Select defaultValue="apple">
        <SelectTrigger>
          <SelectValue placeholder="Select fruit" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="apple">Apple</SelectItem>
          <SelectItem value="banana">Banana</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders SelectTrigger with custom size', () => {
    render(
      <Select>
        <SelectTrigger size="sm" data-testid="trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>
      </Select>
    );

    expect(screen.getByTestId('trigger')).toHaveAttribute('data-size', 'sm');
  });

  it('renders SelectGroup with label', () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Fruits</SelectLabel>
            <SelectItem value="apple">Apple</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText('Fruits')).toBeInTheDocument();
  });

  it('renders SelectSeparator', () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
          <SelectSeparator data-testid="separator" />
          <SelectItem value="b">B</SelectItem>
        </SelectContent>
      </Select>
    );

    expect(screen.getByTestId('separator')).toBeInTheDocument();
  });

  it('renders SelectLabel with custom className', () => {
    render(
      <Select defaultOpen>
        <SelectTrigger>
          <SelectValue placeholder="Select" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel className="custom-class">Label</SelectLabel>
            <SelectItem value="test">Test</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    );

    expect(screen.getByText('Label')).toHaveClass('custom-class');
  });
});
