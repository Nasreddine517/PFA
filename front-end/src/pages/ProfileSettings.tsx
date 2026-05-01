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
  const [specialty, setSpecialty]     = useState("");
  const [hospital, setHospital]       = useState("");
  const [avatarUrl, setAvatarUrl]     = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [loading, setLoading]         = useState(true);

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
        .then(() => toast.success("Photo de profil mise à jour !"))
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
      await updateUserProfile({ fullName: displayName, specialty: specialty || null, hospital: hospital || null, profileImage: avatarUrl || undefined });
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

  const titleGradient = isLight
    ? "linear-gradient(90deg, hsl(152,40%,24%) 0%, hsl(152,35%,32%) 50%, hsl(40,60%,32%) 100%)"
    : "linear-gradient(90deg, hsl(217,70%,80%) 0%, hsl(217,91%,65%) 35%, hsl(43,95%,58%) 70%, hsl(47,100%,62%) 100%)";

  return (
    <div className="p-6 max-w-2xl mx-auto min-h-screen">

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <h1
          className="font-display text-3xl font-bold"
          style={{ backgroundImage: titleGradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}
        >
          {isLight ? "Paramètres du Profil" : "Profile Settings"}
        </h1>
        <p className="mt-1" style={{ color: isLight ? "hsl(150,18%,36%)" : undefined }}>
          {isLight ? "Gérez votre profil médecin" : "Manage your doctor profile"}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl p-8"
        style={isLight ? {
          background: "hsl(40,18%,97%)",
          border: "1px solid hsl(40,22%,74%)",
          boxShadow: "0 4px 24px hsl(152,25%,25%,0.09), 0 2px 0 0 hsl(152,30%,65%)",
        } : {
          background: "linear-gradient(135deg, hsl(220,25%,11%) 0%, hsl(220,25%,9%) 100%)",
          boxShadow: "0 8px 40px rgba(59,130,246,0.12), 0 2px 0 0 hsl(43,95%,55%,0.2), 0 0 0 1px hsl(220,20%,20%)",
          border: "1px solid hsl(var(--border))",
        }}
      >
        {/* Avatar */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative group">
            <div
              className="rounded-full p-0.5"
              style={{
                background: isLight
                  ? "linear-gradient(135deg, hsl(152,35%,55%), hsl(40,55%,50%))"
                  : "linear-gradient(135deg, hsl(217,91%,65%), hsl(43,95%,58%))",
              }}
            >
              <Avatar
                className="w-20 h-20 border-2 border-background"
                style={{ overflow: "hidden" }}
              >
                {avatarUrl ? (
                  <AvatarImage
                    src={avatarUrl}
                    style={{
                      objectFit: "cover",
                      objectPosition: "center top",
                      width: "100%",
                      height: "100%",
                      imageRendering: "auto",
                    }}
                  />
                ) : (
                  <AvatarFallback
                    className="text-xl font-bold font-display"
                    style={isLight ? {
                      background: "linear-gradient(135deg, hsl(152,28%,80%), hsl(40,40%,82%))",
                      color: "hsl(152,38%,22%)",
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
            <h2 className="font-display text-xl font-semibold" style={{ color: isLight ? "hsl(150,30%,12%)" : undefined }}>
              {displayName || "Doctor"}
            </h2>
            <p className="text-sm" style={{ color: isLight ? "hsl(150,16%,38%)" : undefined }}>{user?.email}</p>
            {specialty && (
              <span
                className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium"
                style={isLight ? {
                  background: "hsl(40,50%,88%)",
                  color: "hsl(40,55%,30%)",
                  border: "1px solid hsl(40,45%,74%)",
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

        {/* Champs */}
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
              <Label
                className="flex items-center gap-2 text-sm"
                style={{ color: isLight ? "hsl(150,18%,34%)" : undefined }}
              >
                <field.icon className="w-3.5 h-3.5" /> {field.label}
              </Label>
              <Input
                value={field.value}
                onChange={(e) => field.setter(e.target.value)}
                placeholder={field.placeholder}
                className="h-11 transition-all"
                style={isLight ? {
                  background: "hsl(40,16%,93%)",
                  border: "1px solid hsl(40,22%,72%)",
                  color: "hsl(150,28%,14%)",
                } : {}}
              />
            </motion.div>
          ))}

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="pt-4">
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-12 rounded-xl font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300"
              style={{
                background: saving
                  ? "hsl(152,30%,50%)"
                  : isLight
                    ? "linear-gradient(135deg, hsl(152,38%,30%) 0%, hsl(152,35%,38%) 50%, hsl(40,58%,36%) 100%)"
                    : "linear-gradient(135deg, hsl(217,85%,52%) 0%, hsl(217,91%,60%) 50%, hsl(43,95%,55%) 100%)",
                color: "white",
                boxShadow: saving ? "none" : isLight
                  ? "0 4px 20px hsl(152,35%,32%,0.35)"
                  : "0 4px 20px hsl(217,85%,52%,0.4)",
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

          <motion.button
            onClick={() => navigate("/library")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-10 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200"
            style={isLight ? {
              border: "1px solid hsl(40,22%,72%)",
              color: "hsl(150,20%,32%)",
              background: "hsl(40,16%,93%)",
            } : {
              border: "1px solid hsl(var(--border))",
              color: "hsl(var(--muted-foreground))",
            }}
          >
            <BookOpen className="w-4 h-4" />
            Bibliothèque Médicale
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProfileSettings;