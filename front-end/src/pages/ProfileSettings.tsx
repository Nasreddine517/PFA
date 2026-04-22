import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Building2, Stethoscope, Save, Camera, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ProfileSettings = () => {
  const { user, updateUserProfile } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const isLight = theme === "light";
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
    setSpecialty(user.specialty || "");
    setHospital(user.hospital || "");
    setLoading(false);
  }, [user]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imageUrl = reader.result as string;
      setAvatarUrl(imageUrl);
      void updateUserProfile({ profileImage: imageUrl })
        .then(() => {
          toast.success("Photo de profil mise à jour !");
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Erreur lors de la mise à jour de la photo.";
          toast.error(message);
        });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfile({
        fullName: displayName,
        specialty: specialty || null,
        hospital: hospital || null,
        profileImage: avatarUrl || undefined,
      });
      toast.success("Profil mis à jour !");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur lors de la mise à jour du profil.";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName
    ? displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "DR";

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
          <User className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1
          className="font-display text-3xl font-bold"
          style={{
            backgroundImage: "linear-gradient(90deg, hsl(217,70%,80%) 0%, hsl(217,91%,65%) 35%, hsl(43,95%,58%) 70%, hsl(47,100%,62%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Profile Settings
        </h1>
        <p className="text-muted-foreground mt-1">Manage your doctor profile</p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-border p-8"
        style={isLight ? {
          background: "linear-gradient(135deg, hsl(0,0%,100%) 0%, hsl(217,45%,97%) 100%)",
          boxShadow: "0 8px 40px hsl(217,60%,50%,0.12), 0 2px 0 0 hsl(43,95%,58%,0.3), 0 0 0 1px hsl(217,40%,82%)",
        } : {
          background: "linear-gradient(135deg, hsl(220,25%,11%) 0%, hsl(220,25%,9%) 100%)",
          boxShadow: "0 8px 40px rgba(59,130,246,0.12), 0 2px 0 0 hsl(43,95%,55%,0.2), 0 0 0 1px hsl(220,20%,20%)",
        }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative group">
            <div
              className="rounded-full p-0.5"
              style={{
                background: "linear-gradient(135deg, hsl(217,91%,65%), hsl(43,95%,58%))",
              }}
            >
              <Avatar className="w-20 h-20 border-2 border-background">
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    className="object-cover w-full h-full rounded-full"
                    style={{ objectFit: "cover", objectPosition: "center" }}
                  />
                ) : (
                  <AvatarFallback
                    className="text-xl font-bold font-display"
                    style={isLight ? {
                      background: "linear-gradient(135deg, hsl(217,85%,88%), hsl(43,90%,88%))",
                      color: "hsl(217,85%,35%)",
                    } : {
                      background: "linear-gradient(135deg, hsl(217,60%,20%), hsl(43,60%,18%))",
                      color: "hsl(217,91%,75%)",
                    }}
                  >
                    {initials}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <label
              className="absolute inset-0 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              style={{ background: "rgba(0,0,0,0.45)" }}
            >
              <Camera className="w-5 h-5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </label>
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">{displayName || "Doctor"}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {specialty && (
              <span
                className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium"
                style={isLight ? {
                  background: "hsl(43,95%,90%)",
                  color: "hsl(43,85%,35%)",
                } : {
                  background: "hsl(43,60%,18%)",
                  color: "hsl(43,95%,65%)",
                }}
              >
                {specialty}
              </span>
            )}
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
              <Label className="flex items-center gap-2 text-muted-foreground text-sm">
                <field.icon className="w-3.5 h-3.5" /> {field.label}
              </Label>
              <Input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="transition-all focus:shadow-glow focus:border-primary/40 h-11"
              />
            </motion.div>
          ))}

          {/* Save Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="pt-4"
          >
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 relative overflow-hidden"
              style={{
                background: saving
                  ? "hsl(217,50%,50%)"
                  : "linear-gradient(135deg, hsl(217,85%,52%) 0%, hsl(217,91%,60%) 50%, hsl(43,95%,55%) 100%)",
                color: "white",
                boxShadow: saving
                  ? "none"
                  : "0 4px 20px hsl(217,85%,52%,0.4), 0 0 0 1px hsl(43,95%,55%,0.2)",
              }}
            >
              {saving ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                  <Save className="w-5 h-5" />
                </motion.div>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Profile
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Library shortcut */}
          <motion.button
            onClick={() => navigate("/library")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border border-border transition-all duration-200 text-muted-foreground hover:text-foreground hover:border-primary/40"
          >
            <BookOpen className="w-4 h-4" />
            {" Bibliothèque Médicale"}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;