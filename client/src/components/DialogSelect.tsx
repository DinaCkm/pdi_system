import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { forwardRef } from "react";

/**
 * DialogSelect é um wrapper para Select que funciona corretamente dentro de Dialogs
 * Evita o erro "NotFoundError: Failed to execute 'removeChild' on 'Node'"
 * 
 * Solução: Usar sideOffset e adicionar asChild={false} ao SelectContent
 */

interface DialogSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const DialogSelect = forwardRef<HTMLButtonElement, DialogSelectProps>(
  ({ value, onValueChange, placeholder, children, disabled }, ref) => {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger ref={ref}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent 
          sideOffset={4}
          className="z-50"
        >
          {children}
        </SelectContent>
      </Select>
    );
  }
);

DialogSelect.displayName = "DialogSelect";

export const DialogSelectItem = SelectItem;
