import { useEffect, useState } from 'react';
import { Check, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

export default function ProfilPage() {
  const { user, setUser } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [confirmCurrentPassword, setConfirmCurrentPassword] = useState('');
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Chargement du profil au montage
  useEffect(() => {
    api.profile()
      .then((u) => {
        setFirstName(u.first_name ?? '');
        setLastName(u.last_name ?? '');
        setEmail(u.email ?? '');
        if (u.avatar) setAvatarPreview(u.avatar);
      })
      .catch((e) => setError(e.message));
  }, []);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('La photo ne doit pas dépasser 5 Mo');
      e.target.value = '';
      return;
    }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();
    if (password && (!currentPassword || !confirmCurrentPassword)) {
      setError('Veuillez entrer votre mot de passe actuel et sa confirmation');
      return;
    }
    if (password && currentPassword !== confirmCurrentPassword) {
      setError('Le mot de passe actuel et sa confirmation ne correspondent pas');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess(false);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        name: `${firstName} ${lastName}`.trim(),
      };
      if (email) payload.email = email;
      if (password) {
        payload.password = password;
        payload.current_password = currentPassword;
      }
      if (avatarFile) payload.avatar = avatarPreview;
      const updated = await api.updateProfile(payload);
      setUser(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      setCurrentPassword('');
      setConfirmCurrentPassword('');
      setPassword('');
      setAvatarFile(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800';

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h1 className="text-xl font-bold">Profil</h1>
        <p className="text-sm text-slate-400">
          Gérez vos informations personnelles. Renseignez un nouveau mot de passe (avec le mot de passe actuel) pour le changer.
        </p>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/10">
            Profil mis à jour
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-24 w-24 rounded-full object-cover border-2 border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="h-24 w-24 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400">
                  <Camera size={32} />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800">
                <Camera size={16} /> Choisir une photo
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Prénom</label>
              <input
                className={inputCls}
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Nom</label>
              <input
                className={inputCls}
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Email</label>
            <input
              type="email"
              className={inputCls}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">
              Changer le mot de passe
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Mot de passe actuel</label>
                <input
                  type="password"
                  className={inputCls}
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Confirmer le mot de passe actuel</label>
                <input
                  type="password"
                  className={inputCls}
                  autoComplete="current-password"
                  value={confirmCurrentPassword}
                  onChange={(e) => setConfirmCurrentPassword(e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-500">Nouveau mot de passe</label>
                <input
                  type="password"
                  className={inputCls}
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="Min. 6 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
            >
              <Check size={16} />
              {busy ? 'Enregistrement…' : 'Enregistrer'}
            </button>
            <button
              type="button"
              onClick={() => {
                setFirstName(user?.first_name ?? '');
                setLastName(user?.last_name ?? '');
                setEmail(user?.email ?? '');
                setCurrentPassword('');
                setConfirmCurrentPassword('');
                setPassword('');
                setError('');
                setSuccess(false);
                if (user?.avatar) setAvatarPreview(user.avatar);
                else setAvatarPreview(null);
                setAvatarFile(null);
              }}
              className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              Réinitialiser
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}