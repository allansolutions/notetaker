import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import type { Company } from '../types';

interface CompanyAutocompleteProps {
  companies: Company[];
  selectedCompany: Company | null;
  newCompanyName: string;
  onSelectCompany: (company: Company | null) => void;
  onNewCompanyNameChange: (name: string) => void;
}

export function CompanyAutocomplete({
  companies,
  selectedCompany,
  newCompanyName,
  onSelectCompany,
  onNewCompanyNameChange,
}: CompanyAutocompleteProps): JSX.Element {
  const [inputValue, setInputValue] = useState(
    selectedCompany?.name || newCompanyName
  );
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter companies based on input
  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  // Check if input matches an existing company exactly
  const exactMatch = companies.find(
    (c) => c.name.toLowerCase() === inputValue.toLowerCase()
  );

  // Show "Create" option if input doesn't match any company exactly
  const showCreateOption = inputValue.trim() && !exactMatch;

  // Total items in dropdown (filtered companies + optional create option)
  const totalItems = filteredCompanies.length + (showCreateOption ? 1 : 0);

  // Sync input value with selected company or new company name
  useEffect(() => {
    if (selectedCompany) {
      setInputValue(selectedCompany.name);
    } else if (newCompanyName) {
      setInputValue(newCompanyName);
    }
  }, [selectedCompany, newCompanyName]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setIsOpen(true);
    setHighlightedIndex(-1);

    // Clear selection if input changes
    if (selectedCompany) {
      onSelectCompany(null);
    }
    onNewCompanyNameChange(value);
  };

  const handleSelectCompany = useCallback(
    (company: Company) => {
      setInputValue(company.name);
      onSelectCompany(company);
      onNewCompanyNameChange('');
      setIsOpen(false);
      setHighlightedIndex(-1);
    },
    [onSelectCompany, onNewCompanyNameChange]
  );

  const handleCreateNew = useCallback(() => {
    // Keep the input value as new company name
    onSelectCompany(null);
    onNewCompanyNameChange(inputValue.trim());
    setIsOpen(false);
    setHighlightedIndex(-1);
  }, [inputValue, onSelectCompany, onNewCompanyNameChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        setHighlightedIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          if (highlightedIndex < filteredCompanies.length) {
            handleSelectCompany(filteredCompanies[highlightedIndex]);
          } else if (showCreateOption) {
            handleCreateNew();
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    // Delay closing to allow click events to fire
    setTimeout(() => {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }, 150);
  };

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder="Search or create company..."
        autoComplete="off"
      />
      {isOpen && totalItems > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-border bg-surface shadow-lg"
        >
          {filteredCompanies.map((company, index) => (
            <li
              key={company.id}
              role="option"
              aria-selected={index === highlightedIndex}
              className={`px-3 py-2 cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-surface-alt'
              }`}
              onMouseDown={() => handleSelectCompany(company)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {company.name}
            </li>
          ))}
          {showCreateOption && (
            <li
              role="option"
              aria-selected={highlightedIndex === filteredCompanies.length}
              className={`px-3 py-2 cursor-pointer border-t border-border ${
                highlightedIndex === filteredCompanies.length
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-surface-alt'
              }`}
              onMouseDown={handleCreateNew}
              onMouseEnter={() => setHighlightedIndex(filteredCompanies.length)}
            >
              <span className="text-muted">Create</span>{' '}
              <span className="font-medium">"{inputValue.trim()}"</span>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
