"use client";

import { useEffect, useState, useCallback } from "react";
import {
  scanVisitingCardAction,
  searchDealersAction,
  lookupDuplicateDealerAction,
  submitRecordVisitAction,
} from "./actions";
import {
  canSubmitOrderStepFromLines,
  countFilledOrderLines,
  createEmptyOrderLine,
  OrderLineItems,
  type OrderLineRow,
} from "./order-line-items";
import { normalizeOrderLines, recordVisitSchema } from "@/lib/validations/record-visit";
import {
  canContinueDealerDraft,
  EMPTY_DEALER_DRAFT_TOUCHED,
  markAllRequiredDealerFieldsTouched,
  type DealerDraftTouched,
} from "@/lib/validations/dealer-draft";
import { compressImageFile } from "@/lib/utils/compress-image";
import type { DealerSearchResult, DuplicateDealerLookupResult } from "@/lib/business/dealers";
import type { OrderPlacement } from "@/lib/business/order-lines";
import type { CatalogProduct } from "@/lib/types/catalog";
import {
  type DealerEntryMode,
  type DealerDraft,
  type ResolvedDealer,
  type VisitStep,
  EMPTY_DEALER_DRAFT,
  draftFromFields,
} from "@/lib/types/salesman-visit";
import { VisitProgress } from "@/components/salesman/visit-progress";
import { DealerModeSegment } from "@/components/salesman/dealer-mode-segment";
import { ScanCardPanel } from "@/components/salesman/scan-card-panel";
import { DealerVerifyPanel } from "@/components/salesman/dealer-verify-panel";
import { DealerSearchPanel } from "@/components/salesman/dealer-search-panel";
import { DuplicateDealerNotice } from "@/components/salesman/duplicate-dealer-banner";
import { StickyFormCta } from "@/components/salesman/sticky-form-cta";
import { VisitSuccessScreen } from "@/components/salesman/visit-success-screen";
import { CompactDealerChip } from "@/components/salesman/compact-dealer-chip";
import { OrderPlacementToggle } from "@/components/salesman/order-placement-toggle";

const MAX_CARD_PHOTOS = 2;

interface RecordVisitFormProps {
  products: CatalogProduct[];
}

export function RecordVisitForm({ products }: RecordVisitFormProps) {
  const [step, setStep] = useState<VisitStep>(1);
  const [dealerEntryMode, setDealerEntryMode] = useState<DealerEntryMode>("scan");
  const [resolvedDealer, setResolvedDealer] = useState<ResolvedDealer>(null);
  const [draft, setDraft] = useState<DealerDraft>(EMPTY_DEALER_DRAFT);
  const [fieldConfidence, setFieldConfidence] = useState<Record<string, number>>({});

  const [cardPhotos, setCardPhotos] = useState<File[]>([]);
  const [cardPreviews, setCardPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DealerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [duplicateDealer, setDuplicateDealer] = useState<DealerSearchResult | null>(null);
  const [possibleDuplicateDealers, setPossibleDuplicateDealers] = useState<DealerSearchResult[]>(
    [],
  );

  const [orderPlacement, setOrderPlacement] = useState<OrderPlacement>(null);
  const [orderLines, setOrderLines] = useState<OrderLineRow[]>([createEmptyOrderLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [recordedAt, setRecordedAt] = useState<Date | null>(null);
  const [savedDealerName, setSavedDealerName] = useState("");
  const [savedVisitNumber, setSavedVisitNumber] = useState("");
  const [savedHasOrder, setSavedHasOrder] = useState(false);
  const [savedItemCount, setSavedItemCount] = useState(0);

  const [fieldTouched, setFieldTouched] = useState<DealerDraftTouched>(EMPTY_DEALER_DRAFT_TOUCHED);

  useEffect(() => {
    if (dealerEntryMode !== "search" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      searchDealersAction(searchQuery)
        .then(setSearchResults)
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timeout);
  }, [searchQuery, dealerEntryMode]);

  useEffect(() => {
    const urls = cardPhotos.map((file) => URL.createObjectURL(file));
    setCardPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [cardPhotos]);

  function applyDuplicateLookup(result: DuplicateDealerLookupResult) {
    if (result.status === "exact_match") {
      setDuplicateDealer(result.dealer);
      setPossibleDuplicateDealers([]);
      return;
    }
    if (result.status === "possible_matches") {
      setDuplicateDealer(null);
      setPossibleDuplicateDealers(result.candidates);
      return;
    }
    setDuplicateDealer(null);
    setPossibleDuplicateDealers([]);
  }

  const checkDuplicate = useCallback(async (currentDraft: DealerDraft) => {
    const hasPhone =
      currentDraft.phone.replace(/\D/g, "").length >= 10 ||
      currentDraft.phones.some((phone) => phone.replace(/\D/g, "").length >= 10);
    const hasName = currentDraft.dealerName.trim().length >= 2;

    if (!hasPhone && !hasName) {
      setDuplicateDealer(null);
      setPossibleDuplicateDealers([]);
      return;
    }

    const result = await lookupDuplicateDealerAction({
      phone: currentDraft.phone,
      phones: currentDraft.phones,
      businessName: currentDraft.dealerName,
      city: currentDraft.city,
    });
    applyDuplicateLookup(result);
  }, []);

  useEffect(() => {
    if (dealerEntryMode === "search" || resolvedDealer?.source === "existing") return;
    const timeout = setTimeout(() => {
      void checkDuplicate(draft);
    }, 400);
    return () => clearTimeout(timeout);
  }, [
    draft.phone,
    draft.phones,
    draft.dealerName,
    draft.city,
    dealerEntryMode,
    resolvedDealer,
    checkDuplicate,
  ]);

  function resetForm() {
    setStep(1);
    setDealerEntryMode("scan");
    setResolvedDealer(null);
    setDraft(EMPTY_DEALER_DRAFT);
    setFieldConfidence({});
    setCardPhotos([]);
    setScanComplete(false);
    setScanError(null);
    setSearchQuery("");
    setSearchResults([]);
    setDuplicateDealer(null);
    setPossibleDuplicateDealers([]);
    setOrderPlacement(null);
    setOrderLines([createEmptyOrderLine()]);
    setSubmitError(null);
    setRecordedAt(null);
    setSavedDealerName("");
    setSavedVisitNumber("");
    setSavedHasOrder(false);
    setSavedItemCount(0);
    setFieldTouched(EMPTY_DEALER_DRAFT_TOUCHED);
  }

  function handleOrderPlacementChange(value: OrderPlacement) {
    setOrderPlacement(value);
    setSubmitError(null);
    if (value === "yes") {
      setOrderLines([createEmptyOrderLine()]);
    } else if (value === "no") {
      setOrderLines([]);
    }
  }

  async function runScan(photos: File[]) {
    setScanning(true);
    setScanError(null);

    try {
      const formData = new FormData();
      photos.forEach((photo, index) => {
        formData.set(`cardImage${index}`, photo);
      });

      const result = await scanVisitingCardAction(formData);

      if (!result.success || !result.fields) {
        setScanError(
          result.error ??
            "Couldn't read the card — try better lighting or retake the photo.",
        );
        setScanComplete(false);
        return;
      }

      setDraft(draftFromFields(result.fields));
      setFieldConfidence(result.fields.fieldConfidence ?? {});
      setScanComplete(true);
      if (result.duplicateLookup) {
        applyDuplicateLookup(result.duplicateLookup);
      }
    } catch {
      setScanError("Couldn't read the card — try better lighting or retake the photo.");
      setScanComplete(false);
    } finally {
      setScanning(false);
    }
  }

  async function handleCardPhotoChange(files: FileList | null) {
    if (!files?.length) return;
    setScanError(null);
    setScanComplete(false);
    try {
      const selected = Array.from(files).slice(0, MAX_CARD_PHOTOS);
      const compressed = await Promise.all(selected.map((file) => compressImageFile(file)));
      setCardPhotos(compressed);
      await runScan(compressed);
    } catch {
      setScanError("Could not process the image. Try another photo.");
    }
  }

  function handleRetake() {
    setCardPhotos([]);
    setScanComplete(false);
    setScanError(null);
    setFieldConfidence({});
    setDuplicateDealer(null);
    setPossibleDuplicateDealers([]);
  }

  function handleUseExistingDealer(dealer: DealerSearchResult) {
    setResolvedDealer({ source: "existing", dealerId: dealer.id, snapshot: dealer });
    setDuplicateDealer(null);
    setPossibleDuplicateDealers([]);
    setDealerEntryMode("search");
    setSelectedDealerFromSearch(dealer);
  }

  function setSelectedDealerFromSearch(dealer: DealerSearchResult) {
    setResolvedDealer({ source: "existing", dealerId: dealer.id, snapshot: dealer });
  }

  const canContinueStep1 =
    resolvedDealer?.source === "existing" || canContinueDealerDraft(draft);

  function handleContinueStep1() {
    if (resolvedDealer?.source === "existing") {
      setOrderPlacement(null);
      setStep(2);
      return;
    }

    if (!canContinueDealerDraft(draft)) {
      setFieldTouched((current) => ({ ...current, ...markAllRequiredDealerFieldsTouched() }));
      return;
    }

    setResolvedDealer({ source: "new", draft });
    setOrderPlacement(null);
    setStep(2);
  }

  function handleFieldBlur(field: keyof DealerDraftTouched) {
    setFieldTouched((current) => ({ ...current, [field]: true }));
  }

  const step2DealerName =
    resolvedDealer?.source === "existing"
      ? resolvedDealer.snapshot.business_name
      : resolvedDealer?.source === "new"
        ? resolvedDealer.draft.dealerName
        : draft.dealerName;

  const hasOrder = orderPlacement === "yes";
  const canSaveStep2 = canSubmitOrderStepFromLines(orderPlacement, orderLines);

  async function handleSubmit() {
    setSubmitError(null);
    const activeDraft =
      resolvedDealer?.source === "new" ? resolvedDealer.draft : draft;

    const normalizedLines = hasOrder ? normalizeOrderLines(orderLines) : [];
    const validation =
      resolvedDealer?.source === "existing"
        ? recordVisitSchema.safeParse({
            dealerMode: "existing",
            dealerId: resolvedDealer.dealerId,
            hasOrder,
            orderLines: normalizedLines,
          })
        : recordVisitSchema.safeParse({
            dealerMode: "new",
            dealerName: activeDraft.dealerName,
            phone: activeDraft.phone,
            phones: activeDraft.phones,
            address: activeDraft.address || undefined,
            city: activeDraft.city || undefined,
            state: activeDraft.state || undefined,
            pincode: activeDraft.pincode || undefined,
            latitude: activeDraft.location?.lat,
            longitude: activeDraft.location?.lng,
            hasOrder,
            orderLines: normalizedLines,
          });

    if (!validation.success) {
      setSubmitError(validation.error.issues[0]?.message ?? "Please check the form and try again.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();

    if (resolvedDealer?.source === "existing") {
      formData.set("dealerMode", "existing");
      formData.set("dealerId", resolvedDealer.dealerId);
    } else {
      formData.set("dealerMode", "new");
      formData.set("dealerName", activeDraft.dealerName);
      formData.set("phone", activeDraft.phone);
      formData.set("phones", JSON.stringify(activeDraft.phones));
      formData.set("address", activeDraft.address);
      formData.set("city", activeDraft.city);
      formData.set("state", activeDraft.state);
      formData.set("pincode", activeDraft.pincode);
      if (activeDraft.location) {
        formData.set("latitude", String(activeDraft.location.lat));
        formData.set("longitude", String(activeDraft.location.lng));
      }
    }

    formData.set("hasOrder", String(hasOrder));
    formData.set(
      "orderLines",
      JSON.stringify(
        orderLines.map(({ productId, productName, quantity }) => ({
          productId,
          productName,
          quantity,
        })),
      ),
    );
    cardPhotos.forEach((file, index) => {
      formData.set(`cardImage${index}`, file);
    });

    const result = await submitRecordVisitAction(formData);
    setSubmitting(false);

    if (result.success) {
      setSavedDealerName(
        resolvedDealer?.source === "existing"
          ? resolvedDealer.snapshot.business_name
          : activeDraft.dealerName,
      );
      setSavedVisitNumber(result.visitNumber ?? "");
      setSavedHasOrder(hasOrder);
      setSavedItemCount(result.itemCount ?? countFilledOrderLines(orderLines));
      setRecordedAt(new Date());
      setStep("success");
    } else {
      setSubmitError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (step === "success" && recordedAt) {
    return (
      <VisitSuccessScreen
        dealerName={savedDealerName}
        visitNumber={savedVisitNumber}
        hasOrder={savedHasOrder}
        itemCount={savedItemCount}
        recordedAt={recordedAt}
        onRecordAnother={resetForm}
      />
    );
  }

  const progressStep: VisitStep = step;

  return (
    <>
      <div className="flex flex-col gap-6 pb-24">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {step === 2 ? "Order details" : "Record Visit"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {step === 1
              ? "Add or select the dealer you're visiting"
              : `What did ${step2DealerName || "this dealer"} order?`}
          </p>
        </div>

        <VisitProgress step={progressStep} />

        {step === 1 ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-muted-foreground">
                How would you like to identify the dealer?
              </p>
              <DealerModeSegment
                value={dealerEntryMode}
                onChange={(mode) => {
                  setDealerEntryMode(mode);
                  setResolvedDealer(null);
                  setDuplicateDealer(null);
                  setPossibleDuplicateDealers([]);
                }}
              />
            </div>

            {dealerEntryMode === "scan" ? (
              <ScanCardPanel
                cardPreviews={cardPreviews}
                scanning={scanning}
                scanComplete={scanComplete}
                scanError={scanError}
                onPhotosSelected={(files) => void handleCardPhotoChange(files)}
                onRetake={handleRetake}
              />
            ) : null}

            {dealerEntryMode === "search" ? (
              <DealerSearchPanel
                query={searchQuery}
                results={searchResults}
                searching={searching}
                selectedDealer={
                  resolvedDealer?.source === "existing" ? resolvedDealer.snapshot : null
                }
                onQueryChange={(q) => {
                  setSearchQuery(q);
                  setResolvedDealer(null);
                }}
                onSelect={setSelectedDealerFromSearch}
              />
            ) : null}

            {resolvedDealer?.source !== "existing" &&
            (duplicateDealer || possibleDuplicateDealers.length > 0) &&
            ((dealerEntryMode === "scan" && scanComplete) || dealerEntryMode === "manual") ? (
              <DuplicateDealerNotice
                exactMatch={duplicateDealer}
                possibleMatches={possibleDuplicateDealers}
                onUseExisting={handleUseExistingDealer}
              />
            ) : null}

            {(dealerEntryMode === "scan" && scanComplete) || dealerEntryMode === "manual" ? (
              <DealerVerifyPanel
                draft={draft}
                fieldConfidence={fieldConfidence}
                showVerifyHeader={dealerEntryMode === "scan"}
                touched={fieldTouched}
                onChange={(patch) =>
                  setDraft((prev) => ({
                    ...prev,
                    ...(typeof patch === "function" ? patch(prev) : patch),
                  }))
                }
                onFieldBlur={handleFieldBlur}
              />
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex flex-col gap-4">
            {step2DealerName ? <CompactDealerChip dealerName={step2DealerName} /> : null}

            <OrderPlacementToggle
              value={orderPlacement}
              onChange={handleOrderPlacementChange}
            />

            <OrderLineItems
              products={products}
              lines={orderLines}
              onChange={setOrderLines}
              orderPlacement={orderPlacement}
            />

            {submitError ? <p className="text-sm text-destructive">{submitError}</p> : null}
          </div>
        ) : null}
      </div>

      <StickyFormCta
        label={
          step === 1 ? "Continue to order details →" : submitting ? "Saving…" : "Save visit"
        }
        disabled={step === 1 ? !canContinueStep1 : submitting || !canSaveStep2}
        loading={step === 2 && submitting}
        onClick={() => (step === 1 ? handleContinueStep1() : void handleSubmit())}
        secondaryLabel={step === 2 ? "Back" : undefined}
        onSecondaryClick={step === 2 ? () => setStep(1) : undefined}
      />
    </>
  );
}
