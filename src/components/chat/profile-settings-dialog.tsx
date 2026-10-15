"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, LoaderCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "@/components/chat/avatar";
import {
  requestAvatarUploadSignature,
  updateMyProfile,
  uploadAvatarImage,
} from "@/lib/chat-api";
import type { AuthUser } from "@/lib/auth";

interface ProfileSettingsDialogProps {
  open: boolean;
  currentUser: AuthUser;
  onClose: () => void;
  onSaved: (user: AuthUser) => void;
}

export function ProfileSettingsDialog({ open, currentUser, onClose, onSaved }: ProfileSettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [displayName, setDisplayName] = useState(currentUser.name);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const selectAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error("Choose a JPG, PNG, or WebP image smaller than 5 MB.");
      return;
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const previewUrl = URL.createObjectURL(file);
    previewUrlRef.current = previewUrl;
    setAvatarFile(file);
    setAvatarPreview(previewUrl);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = displayName.trim().replace(/\s+/g, " ");
    if (normalizedName.length < 2 || normalizedName.length > 80 || /[\u0000-\u001f\u007f]/.test(normalizedName)) {
      toast.error("Display name must be between 2 and 80 valid characters.");
      return;
    }

    setIsSaving(true);
    try {
      let avatarPublicId: string | undefined;
      if (avatarFile) {
        const signature = await requestAvatarUploadSignature();
        avatarPublicId = await uploadAvatarImage(avatarFile, signature);
      }
      const updated = await updateMyProfile({
        displayName: normalizedName,
        avatarPublicId,
      });
      onSaved({
        id: updated.id,
        name: updated.displayName,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
      });
      toast.success("Profile updated");
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn’t update your profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="profile-settings-title"
      className="m-auto w-[min(92vw,480px)] max-w-none border border-[#d9e5de] bg-white p-0 text-[#20352b] shadow-[0_24px_80px_rgba(20,50,35,0.2)] backdrop:bg-[#183c2c]/35"
      onClose={onClose}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <form onSubmit={(event) => void saveProfile(event)}>
        <header className="flex items-center justify-between border-b border-[#e6ede7] px-6 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.14em] text-[#829188]">YOUR ACCOUNT</p>
            <h2 id="profile-settings-title" className="mt-1 font-heading text-xl font-semibold">Profile settings</h2>
          </div>
          <button
            type="button"
            aria-label="Close profile settings"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-full text-[#64766b] transition hover:bg-[#f0f4f1] focus-visible:outline-2 focus-visible:outline-[#287254]"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="px-6 py-6">
          <div className="flex items-center gap-4">
            <Avatar src={avatarPreview ?? currentUser.avatarUrl} name={displayName || currentUser.name} size="lg" />
            <div>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 border border-[#d4e0d7] px-3 text-sm font-semibold text-[#315b43] transition hover:bg-[#f2f7f3]">
                <Camera size={16} aria-hidden="true" />
                Change photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => selectAvatar(event.currentTarget.files?.[0])}
                />
              </label>
              <p className="mt-2 text-xs text-[#849188]">JPG, PNG, or WebP. Up to 5 MB.</p>
            </div>
          </div>
          <label htmlFor="profile-display-name" className="mt-7 block text-xs font-semibold text-[#55685d]">Display name</label>
          <input
            id="profile-display-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            minLength={2}
            maxLength={80}
            autoComplete="name"
            required
            className="mt-2 h-11 w-full border border-[#dce7df] bg-white px-3 text-sm outline-none focus:border-[#4b8a6d] focus:ring-2 focus:ring-[#4b8a6d]/15"
          />
          <p className="mt-2 text-xs text-[#849188]">Your email address stays linked to Google sign-in.</p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#e6ede7] bg-[#fbfdfb] px-6 py-4">
          <button type="button" onClick={onClose} className="min-h-10 px-4 text-sm font-medium text-[#5e7066] hover:bg-[#eff4f0]">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-h-10 items-center gap-2 bg-[#287254] px-4 text-sm font-semibold text-white transition hover:bg-[#205c43] disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}
            {isSaving ? "Saving…" : "Save profile"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
