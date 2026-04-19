import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Building2, Stethoscope, Save, Camera } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AnimatedButton from "@/components/AnimatedButton";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface StoredProfile {
  display_name?: string;
  specialty?: string;
  hospital?: string;
  avatar_url?: string | null;
}

const ProfileSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    setAvatarUrl(user.profileImage || null);
    setDisplayName(user.fullName || "");

    try {
      const storedProfile = localStorage.getItem(`lovable_profile_${user.id}`);
      if (storedProfile) {
        const profile: StoredProfile = JSON.parse(storedProfile);
        setDisplayName(profile.display_name || user.fullName || "");
        setSpecialty(profile.specialty || "");
        setHospital(profile.hospital || "");
        setAvatarUrl(profile.avatar_url || user.profileImage || null);
      }
    } catch {
      setSpecialty("");
      setHospital("");
    }
    setLoading(false);
  }, [user]);

  const saveProfile = (profile: StoredProfile) => {
    if (!user) return;
    localStorage.setItem(`lovable_profile_${user.id}`, JSON.stringify(profile));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      setAvatarUrl(imageUrl);
      updateUserProfile({ profileImage: imageUrl });
      saveProfile({
        display_name: displayName,
        specialty,
        hospital,
        avatar_url: imageUrl,
      });
      toast.success("Photo de profil mise à jour !");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    saveProfile({
      display_name: displayName,
      specialty,
      hospital,
      avatar_url: avatarUrl,
    });
    updateUserProfile({ fullName: displayName, profileImage: avatarUrl || undefined });

    toast.success("Profile updated successfully!");
    setSaving(false);
  };

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "DR";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <User className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1 className="font-display text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your doctor profile</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl bg-gradient-card border border-border shadow-card p-8"
      >
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative group">
            <Avatar className="w-20 h-20 border-2 border-primary/20">
              <AvatarImage src={avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-display text-xl">{initials}</AvatarFallback>
            </Avatar>
            <label className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="w-5 h-5 text-foreground" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">{displayName || "Doctor"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          {[
            { icon: User, label: "Display Name", value: displayName, setter: setDisplayName, placeholder: "Dr. Jane Smith" },
            { icon: Stethoscope, label: "Specialty", value: specialty, setter: setSpecialty, placeholder: "e.g. Neuroradiology" },
            { icon: Building2, label: "Hospital", value: hospital, setter: setHospital, placeholder: "e.g. Johns Hopkins Hospital" },
          ].map((field, i) => (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="space-y-2"
            >
              <Label className="flex items-center gap-2 text-muted-foreground">
                <field.icon className="w-3.5 h-3.5" /> {field.label}
              </Label>
              <Input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="transition-all focus:shadow-glow focus:border-primary/40"
              />
            </motion.div>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="pt-4"
          >
            <AnimatedButton onClick={handleSave} disabled={saving} className="w-full h-12 gap-2 text-base">
              <Save className="w-5 h-5" />
              {saving ? "Saving..." : "Save Profile"}
            </AnimatedButton>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;
