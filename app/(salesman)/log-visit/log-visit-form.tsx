"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { searchDealersAction, submitVisitAction } from "./actions";
import type { DealerSearchResult } from "@/lib/business/dealers";

interface Product {
  id: string;
  name: string;
}

type InterestLevel = "low" | "medium" | "high";

export function LogVisitForm({ products }: { products: Product[] }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [dealerMode, setDealerMode] = useState<"search" | "new">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DealerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDealer, setSelectedDealer] = useState<DealerSearchResult | null>(null);
  const [newDealer, setNewDealer] = useState({ name: "", city: "", state: "", phone: "" });

  const [notes, setNotes] = useState("");
  const [productInterests, setProductInterests] = useState<Record<string, InterestLevel>>({});
  const [followupDescription, setFollowupDescription] = useState("");
  const [followupDueDate, setFollowupDueDate] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [photo, setPhoto] = useState<File | null>(null);

  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [savedDealerName, setSavedDealerName] = useState("");

  useEffect(() => {
    if (dealerMode !== "search" || searchQuery.trim().length < 2) {
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
  }, [searchQuery, dealerMode]);

  useEffect(() => {
    setMicSupported(
      typeof navigator !== "undefined" &&
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof MediaRecorder !== "undefined",
    );
  }, []);

  // Release the mic if the component unmounts mid-recording (e.g. the
  // salesman navigates away).
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function resetForm() {
    setStep(1);
    setDealerMode("search");
    setSearchQuery("");
    setSearchResults([]);
    setSelectedDealer(null);
    setNewDealer({ name: "", city: "", state: "", phone: "" });
    setNotes("");
    setProductInterests({});
    setFollowupDescription("");
    setFollowupDueDate("");
    setLocation(null);
    setLocationError(null);
    setPhoto(null);
    clearVoiceNote();
    setVoiceError(null);
    setSubmitError(null);
    setSuccess(false);
  }

  function captureLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocationError(err.message || "Couldn't get your location.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function startRecording() {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const extension = mimeType.split("/")[1]?.split(";")[0] || "webm";
        const file = new File([blob], `voice-note.${extension}`, { type: mimeType });
        setVoiceFile(file);
        setVoiceUrl(URL.createObjectURL(file));
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      // Permission denied, no mic, or some other runtime failure --
      // degrade to file upload rather than leaving the form stuck.
      setVoiceError("Couldn't access the microphone. Upload an audio file instead.");
      setMicSupported(false);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function clearVoiceNote() {
    setVoiceFile(null);
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceUrl(null);
  }

  function toggleProduct(productId: string, checked: boolean) {
    setProductInterests((prev) => {
      const next = { ...prev };
      if (checked) {
        next[productId] = next[productId] ?? "medium";
      } else {
        delete next[productId];
      }
      return next;
    });
  }

  const canContinueFromStep1 =
    (dealerMode === "search" && selectedDealer !== null) ||
    (dealerMode === "new" && newDealer.name.trim().length > 0);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);

    const formData = new FormData();
    if (dealerMode === "search" && selectedDealer) {
      formData.set("dealerMode", "existing");
      formData.set("dealerId", selectedDealer.id);
    } else {
      formData.set("dealerMode", "new");
      formData.set("newDealerName", newDealer.name);
      formData.set("newDealerCity", newDealer.city);
      formData.set("newDealerState", newDealer.state);
      formData.set("newDealerPhone", newDealer.phone);
    }

    formData.set("notes", notes);
    formData.set(
      "productInterests",
      JSON.stringify(
        Object.entries(productInterests).map(([productId, interestLevel]) => ({
          productId,
          interestLevel,
        })),
      ),
    );
    formData.set("followupDescription", followupDescription);
    formData.set("followupDueDate", followupDueDate);
    if (location) {
      formData.set("latitude", String(location.lat));
      formData.set("longitude", String(location.lng));
    }
    if (photo) {
      formData.set("photo", photo);
    }
    if (voiceFile) {
      formData.set("voiceNote", voiceFile);
    }

    const result = await submitVisitAction(formData);
    setSubmitting(false);

    if (result.success) {
      setSavedDealerName(selectedDealer?.business_name ?? newDealer.name);
      setSuccess(true);
    } else {
      setSubmitError(result.error ?? "Something went wrong. Please try again.");
    }
  }

  if (success) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <p className="text-lg font-medium">Visit logged!</p>
          <p className="text-sm text-muted-foreground">{savedDealerName} — saved successfully.</p>
          <Button onClick={resetForm} className="w-full">
            Log Another Visit
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-medium text-muted-foreground">Step {step} of 3</p>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Which dealer?</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={dealerMode === "search" ? "default" : "outline"}
                size="sm"
                onClick={() => setDealerMode("search")}
              >
                Search existing
              </Button>
              <Button
                type="button"
                variant={dealerMode === "new" ? "default" : "outline"}
                size="sm"
                onClick={() => setDealerMode("new")}
              >
                Create new
              </Button>
            </div>

            {dealerMode === "search" ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="dealer-search">Dealer name or phone</Label>
                <Input
                  id="dealer-search"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedDealer(null);
                  }}
                  placeholder="e.g. Sharma Auto"
                />
                {searching ? <p className="text-xs text-muted-foreground">Searching…</p> : null}
                {searchResults.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {searchResults.map((dealer) => (
                      <li key={dealer.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedDealer(dealer)}
                          className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                            selectedDealer?.id === dealer.id
                              ? "border-primary bg-primary/5"
                              : "border-border"
                          }`}
                        >
                          <div className="font-medium">{dealer.business_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[dealer.city, dealer.state].filter(Boolean).join(", ") || "—"}
                            {dealer.phone_number ? ` · ${dealer.phone_number}` : ""}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!searching && searchQuery.trim().length >= 2 && searchResults.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No matches. Switch to &quot;Create new&quot; if this dealer doesn&apos;t exist yet.
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-dealer-name">Business name</Label>
                  <Input
                    id="new-dealer-name"
                    value={newDealer.name}
                    onChange={(e) => setNewDealer((d) => ({ ...d, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-dealer-city">City</Label>
                  <Input
                    id="new-dealer-city"
                    value={newDealer.city}
                    onChange={(e) => setNewDealer((d) => ({ ...d, city: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-dealer-state">State</Label>
                  <Input
                    id="new-dealer-state"
                    value={newDealer.state}
                    onChange={(e) => setNewDealer((d) => ({ ...d, state: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="new-dealer-phone">Phone</Label>
                  <Input
                    id="new-dealer-phone"
                    type="tel"
                    value={newDealer.phone}
                    onChange={(e) => setNewDealer((d) => ({ ...d, phone: e.target.value }))}
                  />
                </div>
              </div>
            )}

            <Button type="button" disabled={!canContinueFromStep1} onClick={() => setStep(2)}>
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit details</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you discuss?"
                rows={4}
              />
            </div>

            {products.length > 0 ? (
              <div className="flex flex-col gap-2">
                <Label>Product interest</Label>
                <div className="flex flex-col gap-2">
                  {products.map((product) => {
                    const level = productInterests[product.id];
                    return (
                      <div key={product.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`product-${product.id}`}
                          checked={level !== undefined}
                          onCheckedChange={(checked) => toggleProduct(product.id, checked)}
                        />
                        <Label htmlFor={`product-${product.id}`} className="flex-1 font-normal">
                          {product.name}
                        </Label>
                        {level !== undefined ? (
                          <Select
                            value={level}
                            onValueChange={(value) =>
                              setProductInterests((prev) => ({
                                ...prev,
                                [product.id]: value as InterestLevel,
                              }))
                            }
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">Low</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No products configured yet.</p>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="followup-description">Follow-up (optional)</Label>
              <Input
                id="followup-description"
                value={followupDescription}
                onChange={(e) => setFollowupDescription(e.target.value)}
                placeholder="e.g. Send quotation"
              />
              <Input
                id="followup-due-date"
                type="date"
                value={followupDueDate}
                onChange={(e) => setFollowupDueDate(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Location (optional)</Label>
              {location ? (
                <p className="text-xs text-muted-foreground">
                  Captured: {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </p>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={captureLocation}
                  disabled={locating}
                >
                  {locating ? "Getting location…" : "Add my current location"}
                </Button>
              )}
              {locationError ? <p className="text-xs text-red-600">{locationError}</p> : null}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
              <Button type="button" onClick={() => setStep(3)} className="flex-1">
                Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Photo &amp; voice note (optional)</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="photo">Visiting card or shop photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              />
              {photo ? <p className="text-xs text-muted-foreground">{photo.name}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label>Voice note</Label>
              {voiceFile ? (
                <div className="flex flex-col gap-2">
                  {voiceUrl ? <audio controls src={voiceUrl} className="w-full" /> : null}
                  <Button type="button" variant="outline" size="sm" onClick={clearVoiceNote}>
                    Remove voice note
                  </Button>
                </div>
              ) : micSupported ? (
                <Button
                  type="button"
                  variant={recording ? "destructive" : "outline"}
                  size="sm"
                  onClick={recording ? stopRecording : startRecording}
                >
                  {recording ? "Stop recording" : "Record voice note"}
                </Button>
              ) : (
                <Input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setVoiceFile(file);
                    setVoiceUrl(file ? URL.createObjectURL(file) : null);
                  }}
                />
              )}
              {voiceError ? <p className="text-xs text-red-600">{voiceError}</p> : null}
            </div>

            {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(2)}
                className="flex-1"
                disabled={submitting}
              >
                Back
              </Button>
              <Button type="button" onClick={handleSubmit} className="flex-1" disabled={submitting}>
                {submitting ? "Saving…" : "Save Visit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
