"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DealerDraft } from "@/lib/types/salesman-visit";
import {
  getDealerDraftFieldError,
  type DealerDraftTouched,
} from "@/lib/validations/dealer-draft";
import { applyGeocodeToDraft } from "@/lib/utils/dealer-draft-geocode";
import type { GeocodeDetails } from "@/lib/utils/reverse-geocode";
import { LocationCapture } from "./location-capture";

type DealerDraftPatch =
  | Partial<DealerDraft>
  | ((prev: DealerDraft) => Partial<DealerDraft>);

interface DealerVerifyPanelProps {
  draft: DealerDraft;
  fieldConfidence: Record<string, number>;
  showVerifyHeader?: boolean;
  touched: DealerDraftTouched;
  onChange: (patch: DealerDraftPatch) => void;
  onFieldBlur: (field: keyof DealerDraftTouched) => void;
}

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

function VerifyHint({ confidence, value }: { confidence?: number; value: string }) {
  if (confidence === undefined || confidence >= 0.7 || !value) return null;
  return <p className="text-xs text-amber-600">Please verify</p>;
}

function FieldError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function DealerVerifyPanel({
  draft,
  fieldConfidence,
  showVerifyHeader = true,
  touched,
  onChange,
  onFieldBlur,
}: DealerVerifyPanelProps) {
  const update = (patch: Partial<DealerDraft>) => onChange(patch);

  const dealerNameError = getDealerDraftFieldError("dealerName", draft, touched);
  const phoneError = getDealerDraftFieldError("phone", draft, touched);
  const addressError = getDealerDraftFieldError("address", draft, touched);
  const cityError = getDealerDraftFieldError("city", draft, touched);
  const pincodeError = getDealerDraftFieldError("pincode", draft, touched);

  function handleGeocodeApplied(details: GeocodeDetails) {
    onChange((prev) => applyGeocodeToDraft(prev, details));
  }

  return (
    <div className="flex flex-col gap-4">
      {showVerifyHeader ? (
        <div>
          <h3 className="text-lg font-medium">We found these details</h3>
          <p className="text-sm text-muted-foreground">Review and edit before continuing.</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <RequiredLabel htmlFor="dealer-name">Business name</RequiredLabel>
        <Input
          id="dealer-name"
          size="lg"
          value={draft.dealerName}
          onChange={(e) => update({ dealerName: e.target.value })}
          onBlur={() => onFieldBlur("dealerName")}
          placeholder="e.g. Sharma Auto"
        />
        <VerifyHint confidence={fieldConfidence.businessName} value={draft.dealerName} />
        <FieldError message={dealerNameError} />
      </div>

      <div className="flex flex-col gap-2">
        <RequiredLabel htmlFor="phone">Phone number</RequiredLabel>
        {draft.phones.length > 1 ? (
          <Select
            value={String(draft.primaryPhoneIndex)}
            onValueChange={(v) => {
              const index = Number(v);
              update({
                primaryPhoneIndex: index,
                phone: draft.phones[index] ?? draft.phone,
              });
            }}
          >
            <SelectTrigger className="h-11 w-full">
              <SelectValue placeholder="Select primary phone">
                {draft.phones[draft.primaryPhoneIndex] ?? draft.phone}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {draft.phones.map((p, i) => (
                <SelectItem key={p} value={String(i)}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id="phone"
            size="lg"
            type="tel"
            value={draft.phone}
            onChange={(e) => update({ phone: e.target.value, phones: [e.target.value] })}
            onBlur={() => onFieldBlur("phone")}
            placeholder="e.g. 9876543210"
          />
        )}
        {draft.phones.length > 1 ? (
          <p className="text-xs text-muted-foreground">
            {draft.phones.length} numbers found on card — select primary above
          </p>
        ) : null}
        <VerifyHint confidence={fieldConfidence.phone} value={draft.phone} />
        <FieldError message={phoneError} />
      </div>

      <LocationCapture
        location={draft.location}
        onLocationChange={(location) => update({ location })}
        onGeocodeApplied={handleGeocodeApplied}
      />

      <div className="flex flex-col gap-2">
        <RequiredLabel htmlFor="address">Address</RequiredLabel>
        <Textarea
          id="address"
          value={draft.address}
          onChange={(e) => update({ address: e.target.value })}
          onBlur={() => onFieldBlur("address")}
          placeholder="Shop address"
          rows={2}
          className="min-h-[80px] text-base"
        />
        <VerifyHint confidence={fieldConfidence.address} value={draft.address} />
        <FieldError message={addressError} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <RequiredLabel htmlFor="city">City</RequiredLabel>
          <Input
            id="city"
            size="lg"
            value={draft.city}
            onChange={(e) => update({ city: e.target.value })}
            onBlur={() => onFieldBlur("city")}
            placeholder="Nagpur"
          />
          <VerifyHint confidence={fieldConfidence.city} value={draft.city} />
          <FieldError message={cityError} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            size="lg"
            value={draft.state}
            onChange={(e) => update({ state: e.target.value })}
            placeholder="Maharashtra"
          />
          <VerifyHint confidence={fieldConfidence.state} value={draft.state} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pincode">Pincode</Label>
        <Input
          id="pincode"
          size="lg"
          value={draft.pincode}
          onChange={(e) => update({ pincode: e.target.value })}
          onBlur={() => onFieldBlur("pincode")}
          placeholder="440008"
        />
        <VerifyHint confidence={fieldConfidence.pincode} value={draft.pincode} />
        <FieldError message={pincodeError} />
      </div>
    </div>
  );
}
