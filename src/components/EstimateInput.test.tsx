import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { EstimateInput } from './EstimateInput';

describe('EstimateInput', () => {
  describe('preset buttons', () => {
    it('renders all preset buttons', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      expect(screen.getByRole('button', { name: '15m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '30m' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '1h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2h' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4h' })).toBeInTheDocument();
    });

    it('calls onSubmit with 15 when 15m button clicked', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: '15m' }));
      expect(onSubmit).toHaveBeenCalledWith(15);
    });

    it('calls onSubmit with 30 when 30m button clicked', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: '30m' }));
      expect(onSubmit).toHaveBeenCalledWith(30);
    });

    it('calls onSubmit with 60 when 1h button clicked', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: '1h' }));
      expect(onSubmit).toHaveBeenCalledWith(60);
    });

    it('calls onSubmit with 120 when 2h button clicked', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: '2h' }));
      expect(onSubmit).toHaveBeenCalledWith(120);
    });

    it('calls onSubmit with 240 when 4h button clicked', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      fireEvent.click(screen.getByRole('button', { name: '4h' }));
      expect(onSubmit).toHaveBeenCalledWith(240);
    });
  });

  describe('custom input', () => {
    it('renders custom input field', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      expect(screen.getByPlaceholderText('Custom (min)')).toBeInTheDocument();
    });

    it('renders Set button', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      expect(screen.getByRole('button', { name: 'Set' })).toBeInTheDocument();
    });

    it('Set button is disabled when input is empty', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled();
    });

    it('Set button is disabled when input is 0', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: '0' } });

      expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled();
    });

    it('Set button is disabled when input is negative', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: '-5' } });

      expect(screen.getByRole('button', { name: 'Set' })).toBeDisabled();
    });

    it('Set button is enabled when input is positive', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: '45' } });

      expect(screen.getByRole('button', { name: 'Set' })).not.toBeDisabled();
    });

    it('calls onSubmit with custom value when Set clicked', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: '45' } });
      fireEvent.click(screen.getByRole('button', { name: 'Set' }));

      expect(onSubmit).toHaveBeenCalledWith(45);
    });

    it('calls onSubmit when Enter is pressed in input', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: '90' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSubmit).toHaveBeenCalledWith(90);
    });

    it('does not call onSubmit when Enter pressed with empty input', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not call onSubmit when Enter pressed with invalid input', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: 'abc' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not call onSubmit when Set clicked with invalid input', () => {
      const onSubmit = vi.fn();
      render(<EstimateInput onSubmit={onSubmit} />);

      const input = screen.getByPlaceholderText('Custom (min)');
      fireEvent.change(input, { target: { value: 'abc' } });
      // Force click even though button is disabled
      fireEvent.click(screen.getByRole('button', { name: 'Set' }));

      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
