"use client";
// Pickers used by many report search forms: type 2+ letters, pick one, the id goes to the form
import Autocomplete from "@/components/form/Autocomplete";
import { reportService, ReportCustomer, ReportProduct } from "@/services/reportService";

interface PickerProps {
  text: string;
  onText: (text: string) => void; // typing clears the picked id
  onPick: (id: string, text: string) => void;
}

export function ProductPicker({ text, onText, onPick }: PickerProps) {
  return (
    <Autocomplete<ReportProduct>
      value={text}
      onChange={onText}
      search={(term) => reportService.searchProducts(term)}
      onSelect={(p) => onPick(String(p.id), `${p.name} (${p.part_number})`)}
      renderItem={(p) => (
        <span>
          {p.name} <span className="text-gray-400">· {p.part_number}</span>
        </span>
      )}
      placeholder="Name or part number"
    />
  );
}

export function CustomerPicker({ text, onText, onPick }: PickerProps) {
  return (
    <Autocomplete<ReportCustomer>
      value={text}
      onChange={onText}
      search={(term) => reportService.searchCustomers(term)}
      onSelect={(c) => onPick(String(c.id), c.name)}
      renderItem={(c) => (
        <span>
          {c.name} <span className="text-gray-400">· {c.phone || c.code}</span>
        </span>
      )}
      placeholder="Name, phone or code"
    />
  );
}
