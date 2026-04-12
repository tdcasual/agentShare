import { memo, useCallback } from 'react';
import { Button } from './button';

interface FilterButtonProps<T extends string> {
  active: boolean;
  value: T;
  onSelect: (value: T) => void;
  label: string;
}

/**
 * Generic filter toggle button used across management pages.
 * Renders as a primary/secondary Button with aria-pressed.
 */
export const FilterButton = memo(function FilterButton<T extends string>({
  active,
  value,
  onSelect,
  label,
}: FilterButtonProps<T>) {
  const handleClick = useCallback(() => {
    onSelect(value);
  }, [onSelect, value]);

  return (
    <Button
      variant={active ? 'primary' : 'secondary'}
      size="sm"
      aria-pressed={active}
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}) as <T extends string>(
  props: FilterButtonProps<T>,
) => React.JSX.Element;
