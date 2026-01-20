import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockInput } from './BlockInput';
import { Block } from '../types';

const createMockProps = (blockOverrides: Partial<Block> = {}) => {
  const block: Block = {
    id: 'test-1',
    type: 'paragraph',
    content: 'Test content',
    ...blockOverrides,
  };

  return {
    block,
    onUpdate: vi.fn(),
    onEnter: vi.fn(),
    onBackspace: vi.fn(),
    onMerge: vi.fn(),
    onFocus: vi.fn(),
    onArrowUp: vi.fn(),
    onArrowDown: vi.fn(),
    isFocused: false,
    isSelected: false,
    onSelect: vi.fn(),
    onEnterEdit: vi.fn(),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    numberedIndex: 0,
    isCollapsed: false,
    onToggleCollapse: vi.fn(),
  };
};

describe('BlockInput', () => {
  describe('keyboard navigation in edit mode', () => {
    it('calls onArrowUp when ArrowUp is pressed', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'ArrowUp' });

      expect(props.onArrowUp).toHaveBeenCalledWith('test-1');
    });

    it('calls onArrowDown when ArrowDown is pressed', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'ArrowDown' });

      expect(props.onArrowDown).toHaveBeenCalledWith('test-1');
    });

    it('calls onEnter with split info when Enter is pressed at end', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'Enter' });

      // Cursor defaults to end, so all content stays in current block
      expect(props.onEnter).toHaveBeenCalledWith('test-1', {
        contentBefore: 'Test content',
        contentAfter: '',
      });
    });

    it('splits text at cursor position when Enter is pressed', async () => {
      const props = createMockProps({ content: 'Hello World' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'Hello World';

      // Simulate cursor after "Hello "
      const range = document.createRange();
      if (input!.firstChild) {
        range.setStart(input!.firstChild, 6);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(props.onEnter).toHaveBeenCalledWith('test-1', {
        contentBefore: 'Hello ',
        contentAfter: 'World',
      });
    });

    it('calls onSelect when Cmd+E is pressed', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'e', metaKey: true });

      expect(props.onSelect).toHaveBeenCalledWith('test-1');
    });

    it('calls onMoveUp when Cmd+Shift+ArrowUp is pressed', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, {
        key: 'ArrowUp',
        metaKey: true,
        shiftKey: true,
      });

      expect(props.onMoveUp).toHaveBeenCalledWith('test-1');
    });

    it('calls onMoveDown when Cmd+Shift+ArrowDown is pressed', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, {
        key: 'ArrowDown',
        metaKey: true,
        shiftKey: true,
      });

      expect(props.onMoveDown).toHaveBeenCalledWith('test-1');
    });
  });

  describe('backspace handling', () => {
    it('calls onBackspace when backspace on empty paragraph', async () => {
      const props = createMockProps({ content: '' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      // Set textContent to empty to simulate empty block
      input!.textContent = '';
      fireEvent.keyDown(input!, { key: 'Backspace' });

      expect(props.onBackspace).toHaveBeenCalledWith('test-1');
    });

    it('calls onMerge when backspace at start of non-empty block', async () => {
      const props = createMockProps({
        type: 'paragraph',
        content: 'some text',
      });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'some text';

      // Simulate cursor at start
      const range = document.createRange();
      range.setStart(input!, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      fireEvent.keyDown(input!, { key: 'Backspace' });

      expect(props.onMerge).toHaveBeenCalledWith('test-1');
    });

    it('calls onMerge when backspace at start of non-paragraph block', async () => {
      const props = createMockProps({ type: 'bullet', content: 'item' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'item';

      // Simulate cursor at start
      const range = document.createRange();
      range.setStart(input!, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      fireEvent.keyDown(input!, { key: 'Backspace' });

      expect(props.onMerge).toHaveBeenCalledWith('test-1');
    });
  });

  describe('wrapper keyboard handling (selected mode)', () => {
    it('calls onEnterEdit when Enter pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Enter' });

      expect(props.onEnterEdit).toHaveBeenCalledWith('test-1');
    });

    it('handles Escape when selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      // Should not throw and should not call any handlers
      fireEvent.keyDown(wrapper!, { key: 'Escape' });

      expect(props.onEnterEdit).not.toHaveBeenCalled();
    });

    it('calls onArrowUp when ArrowUp pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'ArrowUp' });

      expect(props.onArrowUp).toHaveBeenCalledWith('test-1');
    });

    it('calls onArrowDown when ArrowDown pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'ArrowDown' });

      expect(props.onArrowDown).toHaveBeenCalledWith('test-1');
    });

    it('calls onMoveUp when Cmd+Shift+ArrowUp pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, {
        key: 'ArrowUp',
        metaKey: true,
        shiftKey: true,
      });

      expect(props.onMoveUp).toHaveBeenCalledWith('test-1');
    });

    it('calls onMoveDown when Cmd+Shift+ArrowDown pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, {
        key: 'ArrowDown',
        metaKey: true,
        shiftKey: true,
      });

      expect(props.onMoveDown).toHaveBeenCalledWith('test-1');
    });

    it('calls onBackspace when Backspace pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Backspace' });

      expect(props.onBackspace).toHaveBeenCalledWith('test-1');
    });

    it('calls onBackspace when Delete pressed while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Delete' });

      expect(props.onBackspace).toHaveBeenCalledWith('test-1');
    });

    it('does not handle keys when not selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={false} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Enter' });

      expect(props.onEnterEdit).not.toHaveBeenCalled();
    });
  });

  describe('todo checkbox', () => {
    it('toggles todo to todo-checked when checkbox clicked', async () => {
      const props = createMockProps({ type: 'todo', content: 'Task' });
      render(<BlockInput {...props} />);

      // Find the todo prefix button that contains the checkbox
      const checkbox = document.querySelector(
        '[data-block-id="test-1"] > button'
      );
      fireEvent.click(checkbox!);

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'Task',
        'todo-checked'
      );
    });

    it('toggles todo-checked to todo when checkbox clicked', async () => {
      const props = createMockProps({ type: 'todo-checked', content: 'Done' });
      render(<BlockInput {...props} />);

      const checkbox = document.querySelector(
        '[data-block-id="test-1"] > button'
      );
      fireEvent.click(checkbox!);

      expect(props.onUpdate).toHaveBeenCalledWith('test-1', 'Done', 'todo');
    });

    it('converts todo to paragraph when Delete pressed at start', async () => {
      const props = createMockProps({ type: 'todo', content: 'Task' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'Task';

      // Simulate cursor at start (right after checkbox)
      const range = document.createRange();
      range.setStart(input!, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      fireEvent.keyDown(input!, { key: 'Delete' });

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'Task',
        'paragraph'
      );
    });

    it('converts todo-checked to paragraph when Delete pressed at start', async () => {
      const props = createMockProps({ type: 'todo-checked', content: 'Done' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'Done';

      // Simulate cursor at start (right after checkbox)
      const range = document.createRange();
      range.setStart(input!, 0);
      range.collapse(true);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);

      fireEvent.keyDown(input!, { key: 'Delete' });

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'Done',
        'paragraph'
      );
    });

    it('does not convert todo when Delete pressed in middle of text', async () => {
      const props = createMockProps({ type: 'todo', content: 'Task' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'Task';

      // Simulate cursor in middle of text
      const range = document.createRange();
      if (input!.firstChild) {
        range.setStart(input!.firstChild, 2);
        range.collapse(true);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }

      fireEvent.keyDown(input!, { key: 'Delete' });

      // Should not convert - Delete at non-start position should be default behavior
      expect(props.onUpdate).not.toHaveBeenCalled();
    });
  });

  describe('H1 collapse toggle', () => {
    it('calls onToggleCollapse when Cmd+Enter on H1', async () => {
      const props = createMockProps({ type: 'h1', content: 'Heading' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'Enter', metaKey: true });

      expect(props.onToggleCollapse).toHaveBeenCalledWith('test-1');
    });

    it('calls onToggleCollapse when H1 toggle icon clicked', async () => {
      const props = createMockProps({ type: 'h1', content: 'Heading' });
      render(<BlockInput {...props} />);

      // H1 toggle is the first button child (contains svg)
      const toggle = document.querySelector(
        '[data-block-id="test-1"] > button'
      );
      fireEvent.click(toggle!);

      expect(props.onToggleCollapse).toHaveBeenCalledWith('test-1');
    });

    it('adds rotate-0 class when isCollapsed is true', async () => {
      const props = createMockProps({ type: 'h1', content: 'Heading' });
      render(<BlockInput {...props} isCollapsed={true} />);

      const toggle = document.querySelector(
        '[data-block-id="test-1"] > button'
      );
      expect(toggle?.classList.contains('rotate-0')).toBe(true);
    });
  });

  describe('todo keyboard toggle', () => {
    it('toggles todo to todo-checked with Cmd+Enter', async () => {
      const props = createMockProps({ type: 'todo', content: 'Task' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'Enter', metaKey: true });

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'Task',
        'todo-checked'
      );
    });

    it('toggles todo-checked to todo with Cmd+Enter', async () => {
      const props = createMockProps({
        type: 'todo-checked',
        content: 'Done task',
      });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      fireEvent.keyDown(input!, { key: 'Enter', metaKey: true });

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'Done task',
        'todo'
      );
    });

    it('toggles todo when selected with Cmd+Enter', async () => {
      const props = createMockProps({ type: 'todo', content: 'Task' });
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Enter', metaKey: true });

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'Task',
        'todo-checked'
      );
    });
  });

  describe('divider block', () => {
    it('renders divider correctly', () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      expect(document.querySelector('hr')).toBeInTheDocument();
    });

    it('calls onArrowUp when ArrowUp pressed on divider', async () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'ArrowUp' });

      expect(props.onArrowUp).toHaveBeenCalledWith('test-1');
    });

    it('calls onArrowDown when ArrowDown pressed on divider', async () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'ArrowDown' });

      expect(props.onArrowDown).toHaveBeenCalledWith('test-1');
    });

    it('calls onBackspace when Backspace pressed on divider', async () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Backspace' });

      expect(props.onBackspace).toHaveBeenCalledWith('test-1');
    });

    it('calls onBackspace when Delete pressed on divider', async () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Delete' });

      expect(props.onBackspace).toHaveBeenCalledWith('test-1');
    });

    it('calls onEnter when Enter pressed on divider', async () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.keyDown(wrapper!, { key: 'Enter' });

      expect(props.onEnter).toHaveBeenCalledWith('test-1');
    });

    it('calls onFocus when divider clicked', async () => {
      const props = createMockProps({ type: 'divider', content: '' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.click(wrapper!);

      expect(props.onFocus).toHaveBeenCalledWith('test-1');
    });
  });

  describe('block type rendering', () => {
    it('renders bullet prefix', () => {
      const props = createMockProps({ type: 'bullet', content: 'item' });
      render(<BlockInput {...props} numberedIndex={0} />);

      expect(screen.getByText('•')).toBeInTheDocument();
    });

    it('renders numbered prefix with correct index', () => {
      const props = createMockProps({ type: 'numbered', content: 'item' });
      render(<BlockInput {...props} numberedIndex={3} />);

      expect(screen.getByText('3.')).toBeInTheDocument();
    });

    it('renders quote with border styling', () => {
      const props = createMockProps({ type: 'quote', content: 'quoted text' });
      render(<BlockInput {...props} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      expect(wrapper?.classList.contains('border-l-[3px]')).toBe(true);
    });

    it('renders code block with mono font', () => {
      const props = createMockProps({ type: 'code', content: 'const x = 1' });
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      expect(input?.classList.contains('font-mono')).toBe(true);
    });

    it('renders h2 block with correct text size', () => {
      const props = createMockProps({ type: 'h2', content: 'Subheading' });
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      expect(input?.classList.contains('text-h2')).toBe(true);
    });

    it('renders h3 block with correct text size', () => {
      const props = createMockProps({ type: 'h3', content: 'Small heading' });
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      expect(input?.classList.contains('text-h3')).toBe(true);
    });
  });

  describe('wrapper click handling', () => {
    it('calls onEnterEdit when wrapper clicked while selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.click(wrapper!);

      expect(props.onEnterEdit).toHaveBeenCalledWith('test-1');
    });

    it('does not call onEnterEdit when wrapper clicked while not selected', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={false} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      fireEvent.click(wrapper!);

      expect(props.onEnterEdit).not.toHaveBeenCalled();
    });
  });

  describe('selected state styling', () => {
    it('adds bg-accent-subtle class when selected', () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={true} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      expect(wrapper?.classList.contains('bg-accent-subtle')).toBe(true);
    });

    it('does not have bg-accent-subtle class when not selected', () => {
      const props = createMockProps();
      render(<BlockInput {...props} isSelected={false} />);

      const wrapper = document.querySelector('[data-block-id="test-1"]');
      expect(wrapper?.classList.contains('bg-accent-subtle')).toBe(false);
    });
  });

  describe('input handling', () => {
    it('calls onUpdate with text and current type on regular input', async () => {
      const props = createMockProps({ type: 'paragraph', content: '' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = 'hello';
      fireEvent.input(input!);

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        'hello',
        'paragraph'
      );
    });

    it('detects and converts paragraph to h1 when typing "# "', async () => {
      const props = createMockProps({ type: 'paragraph', content: '' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = '# heading';
      fireEvent.input(input!);

      expect(props.onUpdate).toHaveBeenCalledWith('test-1', 'heading', 'h1');
    });

    it('detects and converts paragraph to bullet when typing "- "', async () => {
      const props = createMockProps({ type: 'paragraph', content: '' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = '- item';
      fireEvent.input(input!);

      expect(props.onUpdate).toHaveBeenCalledWith('test-1', 'item', 'bullet');
    });

    it('detects and converts paragraph to todo when typing "[] "', async () => {
      const props = createMockProps({ type: 'paragraph', content: '' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = '[] task';
      fireEvent.input(input!);

      expect(props.onUpdate).toHaveBeenCalledWith('test-1', 'task', 'todo');
    });

    it('does not convert non-paragraph blocks', async () => {
      const props = createMockProps({ type: 'h1', content: 'heading' });
      render(<BlockInput {...props} isFocused={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = '- should not convert';
      fireEvent.input(input!);

      expect(props.onUpdate).toHaveBeenCalledWith(
        'test-1',
        '- should not convert',
        'h1'
      );
    });
  });

  describe('focus handling', () => {
    it('calls onFocus when input focused', async () => {
      const props = createMockProps();
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      fireEvent.focus(input!);

      expect(props.onFocus).toHaveBeenCalledWith('test-1');
    });
  });

  describe('placeholder', () => {
    it('sets placeholder for paragraph blocks', () => {
      const props = createMockProps({ type: 'paragraph', content: '' });
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      expect(input?.getAttribute('data-placeholder')).toBe(
        "Type '/' for commands..."
      );
    });

    it('sets placeholder for code blocks', () => {
      const props = createMockProps({ type: 'code', content: '' });
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      expect(input?.getAttribute('data-placeholder')).toBe('Code');
    });

    it('sets empty placeholder for other block types', () => {
      const props = createMockProps({ type: 'h1', content: '' });
      render(<BlockInput {...props} />);

      const input = document.querySelector('.block-input');
      expect(input?.getAttribute('data-placeholder')).toBe('');
    });
  });

  describe('task creation with $ prefix', () => {
    it('calls onTaskCreate when $ prefix typed in last block and Enter pressed', async () => {
      const onTaskCreate = vi.fn();
      const props = createMockProps({ content: '' });
      render(
        <BlockInput
          {...props}
          isFocused={true}
          isLastBlock={true}
          onTaskCreate={onTaskCreate}
        />
      );

      const input = document.querySelector('.block-input');
      input!.textContent = '$ New Task';
      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(onTaskCreate).toHaveBeenCalledWith('New Task');
      expect(props.onEnter).not.toHaveBeenCalled();
    });

    it('clears block content after task creation', async () => {
      const onTaskCreate = vi.fn();
      const props = createMockProps({ content: '' });
      render(
        <BlockInput
          {...props}
          isFocused={true}
          isLastBlock={true}
          onTaskCreate={onTaskCreate}
        />
      );

      const input = document.querySelector('.block-input');
      input!.textContent = '$ New Task';
      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(props.onUpdate).toHaveBeenCalledWith('test-1', '', 'paragraph');
    });

    it('does not call onTaskCreate for non-last blocks', async () => {
      const onTaskCreate = vi.fn();
      const props = createMockProps({ content: '' });
      render(
        <BlockInput
          {...props}
          isFocused={true}
          isLastBlock={false}
          onTaskCreate={onTaskCreate}
        />
      );

      const input = document.querySelector('.block-input');
      input!.textContent = '$ New Task';
      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(onTaskCreate).not.toHaveBeenCalled();
      expect(props.onEnter).toHaveBeenCalled();
    });

    it('does not call onTaskCreate when isLastBlock is not set', async () => {
      const onTaskCreate = vi.fn();
      const props = createMockProps({ content: '' });
      render(
        <BlockInput {...props} isFocused={true} onTaskCreate={onTaskCreate} />
      );

      const input = document.querySelector('.block-input');
      input!.textContent = '$ New Task';
      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(onTaskCreate).not.toHaveBeenCalled();
      expect(props.onEnter).toHaveBeenCalled();
    });

    it('does not call onTaskCreate for empty title after $ prefix', async () => {
      const onTaskCreate = vi.fn();
      const props = createMockProps({ content: '' });
      render(
        <BlockInput
          {...props}
          isFocused={true}
          isLastBlock={true}
          onTaskCreate={onTaskCreate}
        />
      );

      const input = document.querySelector('.block-input');
      input!.textContent = '$  ';
      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(onTaskCreate).not.toHaveBeenCalled();
      expect(props.onEnter).toHaveBeenCalled();
    });

    it('treats $ as regular text when not followed by space', async () => {
      const onTaskCreate = vi.fn();
      const props = createMockProps({ content: '' });
      render(
        <BlockInput
          {...props}
          isFocused={true}
          isLastBlock={true}
          onTaskCreate={onTaskCreate}
        />
      );

      const input = document.querySelector('.block-input');
      input!.textContent = '$100';
      fireEvent.keyDown(input!, { key: 'Enter' });

      expect(onTaskCreate).not.toHaveBeenCalled();
      expect(props.onEnter).toHaveBeenCalled();
    });

    it('does not call onTaskCreate when onTaskCreate is not provided', async () => {
      const props = createMockProps({ content: '' });
      render(<BlockInput {...props} isFocused={true} isLastBlock={true} />);

      const input = document.querySelector('.block-input');
      input!.textContent = '$ New Task';
      fireEvent.keyDown(input!, { key: 'Enter' });

      // Should fall through to regular Enter handling
      expect(props.onEnter).toHaveBeenCalled();
    });
  });
});
