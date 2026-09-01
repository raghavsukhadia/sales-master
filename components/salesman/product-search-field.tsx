"use client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CatalogProduct } from "@/lib/types/catalog";

export interface ProductSearchFieldHandle {
  focus: () => void;
}

interface ProductSearchFieldProps {
  products: CatalogProduct[];
  productId: string | null;
  productName: string;
  isCustom: boolean;
  usedProductIds: Set<string>;
  onSelectCatalog: (product: CatalogProduct) => void;
  onSwitchToCustom: () => void;
  onSwitchToCatalog: () => void;
  onCustomNameChange: (name: string) => void;
  duplicateError?: string | null;
  inputId?: string;
}

export const ProductSearchField = forwardRef<ProductSearchFieldHandle, ProductSearchFieldProps>(
  function ProductSearchField(
    {
      products,
      productId,
      productName,
      isCustom,
      usedProductIds,
      onSelectCatalog,
      onSwitchToCustom,
      onSwitchToCatalog,
      onCustomNameChange,
      duplicateError,
      inputId,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState(productName);
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
        setOpen(true);
      },
    }));

    useEffect(() => {
      if (isCustom || !productId) {
        setQuery(productName);
      } else {
        setQuery(productName);
      }
    }, [isCustom, productId, productName]);

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      return products.filter((product) => {
        if (usedProductIds.has(product.id) && product.id !== productId) return false;
        if (!q) return true;
        return (
          product.name.toLowerCase().includes(q) ||
          (product.category?.toLowerCase().includes(q) ?? false) ||
          (product.description?.toLowerCase().includes(q) ?? false)
        );
      });
    }, [products, query, usedProductIds, productId]);

    function handleSelect(product: CatalogProduct) {
      onSelectCatalog(product);
      setQuery(product.name);
      setOpen(false);
    }

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId}>{isCustom ? "Custom product" : "Product"}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            id={inputId}
            size="lg"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              setOpen(true);
              if (isCustom) onCustomNameChange(next);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setOpen(false), 150);
            }}
            placeholder={isCustom ? "Enter product name" : "Search product..."}
            className="pl-9"
            autoComplete="off"
          />

          {open && !isCustom ? (
            <div className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-lg border bg-popover shadow-md">
              {filtered.length > 0 ? (
                <ul className="py-1">
                  {filtered.map((product) => (
                    <li key={product.id}>
                      <button
                        type="button"
                        className={cn(
                          "flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-accent",
                          product.id === productId && "bg-accent/60",
                        )}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelect(product)}
                      >
                        <span className="font-medium">{product.name}</span>
                        {product.category || product.description ? (
                          <span className="text-xs text-muted-foreground">
                            {[product.category, product.description].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">No products found</p>
              )}
              <button
                type="button"
                className="flex w-full items-center gap-2 border-t px-3 py-2.5 text-left text-sm font-medium text-primary hover:bg-accent"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSwitchToCustom();
                  setQuery("");
                  setOpen(false);
                  window.setTimeout(() => inputRef.current?.focus(), 0);
                }}
              >
                <Plus className="h-4 w-4" />
                Add custom item
              </button>
            </div>
          ) : null}
        </div>

        {!isCustom && productId ? (
          <button
            type="button"
            className="self-start text-xs font-medium text-primary"
            onClick={() => {
              onSwitchToCustom();
              setQuery(productName);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Switch to custom item
          </button>
        ) : null}

        {isCustom ? (
          <button
            type="button"
            className="self-start text-xs font-medium text-primary"
            onClick={() => {
              onSwitchToCatalog();
              setQuery("");
              setOpen(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            Search catalog instead
          </button>
        ) : null}

        {duplicateError ? (
          <p className="text-sm text-destructive">{duplicateError}</p>
        ) : null}
      </div>
    );
  },
);
