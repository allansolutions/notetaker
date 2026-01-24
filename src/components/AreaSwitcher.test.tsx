import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AreaSwitcher } from './AreaSwitcher';

describe('AreaSwitcher', () => {
  it('shows Task Manager when on spreadsheet view', () => {
    render(
      <AreaSwitcher
        currentView="spreadsheet"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent(
      'Task Manager'
    );
  });

  it('shows Task Manager when on task-detail view', () => {
    render(
      <AreaSwitcher
        currentView="task-detail"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent(
      'Task Manager'
    );
  });

  it('shows Task Manager when on archive view', () => {
    render(
      <AreaSwitcher
        currentView="archive"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent(
      'Task Manager'
    );
  });

  it('shows CRM when on crm-list view', () => {
    render(
      <AreaSwitcher
        currentView="crm-list"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent('CRM');
  });

  it('shows CRM when on crm-detail view', () => {
    render(
      <AreaSwitcher
        currentView="crm-detail"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent('CRM');
  });

  it('shows CRM when on crm-new view', () => {
    render(
      <AreaSwitcher
        currentView="crm-new"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent('CRM');
  });

  it('shows Wiki when on wiki-list view', () => {
    render(
      <AreaSwitcher
        currentView="wiki-list"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent('Wiki');
  });

  it('shows Wiki when on wiki-page view', () => {
    render(
      <AreaSwitcher
        currentView="wiki-page"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    expect(screen.getByTestId('area-switcher')).toHaveTextContent('Wiki');
  });

  it('calls onNavigateToCrm when switching from tasks to CRM', async () => {
    const onNavigateToCrm = vi.fn();
    render(
      <AreaSwitcher
        currentView="spreadsheet"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={onNavigateToCrm}
        onNavigateToWiki={vi.fn()}
      />
    );

    // Open the select
    fireEvent.click(screen.getByTestId('area-switcher'));

    // Click on CRM option
    fireEvent.click(screen.getByText('CRM'));

    expect(onNavigateToCrm).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigateToTasks when switching from CRM to tasks', async () => {
    const onNavigateToTasks = vi.fn();
    render(
      <AreaSwitcher
        currentView="crm-list"
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={vi.fn()}
      />
    );

    // Open the select
    fireEvent.click(screen.getByTestId('area-switcher'));

    // Click on Task Manager option
    fireEvent.click(screen.getByText('Task Manager'));

    expect(onNavigateToTasks).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigateToWiki when switching from tasks to Wiki', async () => {
    const onNavigateToWiki = vi.fn();
    render(
      <AreaSwitcher
        currentView="spreadsheet"
        onNavigateToTasks={vi.fn()}
        onNavigateToCrm={vi.fn()}
        onNavigateToWiki={onNavigateToWiki}
      />
    );

    // Open the select
    fireEvent.click(screen.getByTestId('area-switcher'));

    // Click on Wiki option
    fireEvent.click(screen.getByText('Wiki'));

    expect(onNavigateToWiki).toHaveBeenCalledTimes(1);
  });

  it('does not navigate when selecting the current area', async () => {
    const onNavigateToTasks = vi.fn();
    const onNavigateToCrm = vi.fn();
    const onNavigateToWiki = vi.fn();
    render(
      <AreaSwitcher
        currentView="spreadsheet"
        onNavigateToTasks={onNavigateToTasks}
        onNavigateToCrm={onNavigateToCrm}
        onNavigateToWiki={onNavigateToWiki}
      />
    );

    // Open the select
    fireEvent.click(screen.getByTestId('area-switcher'));

    // Click on Task Manager option (already selected)
    // Use getAllByText since there are two: one in trigger, one in dropdown
    const taskManagerElements = screen.getAllByText('Task Manager');
    fireEvent.click(taskManagerElements[taskManagerElements.length - 1]);

    expect(onNavigateToTasks).not.toHaveBeenCalled();
    expect(onNavigateToCrm).not.toHaveBeenCalled();
    expect(onNavigateToWiki).not.toHaveBeenCalled();
  });
});
