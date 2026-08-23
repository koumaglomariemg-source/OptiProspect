import { useEffect, useState } from "react";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { formatDate, initials, ROLE_LABEL, ROLE_BADGE } from "../constants.js";
import Modal from "../components/Modal.jsx";
import UserDetailModal from "../components/UserDetailModal.jsx";

export default function TeamPage() {
  const { user: current } = useAuth();
  const [users, setUsers] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    role: "commercial",
    manager_id: "",
  });
  const [loadError, setLoadError] = useState("");
  const [editUser, setEditUser] = useState(null);
  const [editBusy, setEditBusy] = useState(false);
  const [mailNote, setMailNote] = useState("");

  const managers = users.filter((u) => u.role === "manager");

  const load = () => {
    setLoadError("");
    api
      .users()
      .then((rows) => setUsers(rows))
      .catch((err) => setLoadError(err.message));
  };
  useEffect(load, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMailNote("");
    try {
      const created = await api.createUser({
        ...form,
        name:
          [form.first_name, form.last_name].filter(Boolean).join(" ").trim() ||
          form.name,
        manager_id: form.manager_id || null,
      });
      setFormOpen(false);
      setForm({
        name: "",
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        role: "commercial",
        manager_id: "",
      });
      if (created?.email_status === "sent") {
        setMailNote(`Email envoyé à ${created.name}.`);
      } else if (created?.email_status === "error") {
        setMailNote(
          "Compte créé mais l'email n'a pas pu être envoyé (erreur SMTP).",
        );
      } else {
        setMailNote(
          "Compte créé. L'email n'a pas été envoyé : le serveur SMTP n'est pas configuré (renseignez SMTP_USER/SMTP_PASS dans server/.env).",
        );
      }
      setTimeout(() => setMailNote(""), 4000);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (u, role) => {
    setError("");
    try {
      await api.updateUser(u.id, { role });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeManager = async (u, managerId) => {
    setError("");
    try {
      await api.updateUser(u.id, { manager_id: managerId || null });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (u) => {
    if (!confirm(`Supprimer ${u.name} ?`)) return;
    try {
      await api.deleteUser(u.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setEditBusy(true);
    setError("");
    try {
      const payload = {};
      if (editUser.name.trim()) payload.name = editUser.name.trim();
      if (editUser.first_name !== undefined)
        payload.first_name = editUser.first_name;
      if (editUser.last_name !== undefined)
        payload.last_name = editUser.last_name;
      if (editUser.email.trim())
        payload.email = editUser.email.trim().toLowerCase();
      if (editUser.role) payload.role = editUser.role;
      if (editUser.manager_id !== undefined)
        payload.manager_id = editUser.manager_id || null;
      if (editUser.password) payload.password = editUser.password;
      await api.updateUser(editUser.id, payload);
      setEditUser(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setEditBusy(false);
    }
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800";

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Équipe</h1>
            <p className="text-sm text-slate-400">
              Gérez les comptes, les rôles et l'équipe de chaque commercial
            </p>
          </div>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <Plus size={16} /> Ajouter un membre
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {error}
          </div>
        )}
        {mailNote && (
          <div className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            {mailNote}
          </div>
        )}
        {loadError && (
          <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
            {loadError}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {!loadError && users.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-400">
              Aucun membre pour le moment
            </div>
          )}
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-wrap items-center gap-4 border-b border-slate-100 p-4 last:border-0 dark:border-slate-800"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-base font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300">
                {initials(u.name)}
              </div>
              <div className="min-w-0 flex-1 min-w-[200px]">
                <button
                  onClick={() => setDetailId(u.id)}
                  className="block w-full text-left"
                  title="Voir la fiche utilisateur"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="truncate text-base font-semibold">
                      {u.name}
                    </span>
                    {u.id === current?.id && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-slate-800">
                        Vous
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 mt-1 text-xs text-slate-400">
                    <span>{u.email}</span>
                    <span>{u.prospect_count} prospects</span>
                    <span>inscrit le {formatDate(u.created_at)}</span>
                  </div>
                  {u.role === "commercial" && (
                    <div className="mt-0.5 text-xs text-slate-400">
                      Équipe :{" "}
                      {u.manager_name || (
                        <span className="italic">non affecté</span>
                      )}
                    </div>
                  )}
                </button>
              </div>
              <div className="flex shrink-0 items-center gap-2 flex-wrap">
                {u.role === "commercial" && (
                  <select
                    value={u.manager_id || ""}
                    onChange={(e) => changeManager(u, e.target.value)}
                    title="Assigner un manager"
                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 outline-none transition focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <option value="">Sans manager</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u, e.target.value)}
                  disabled={u.id === current?.id}
                  title={
                    u.id === current?.id
                      ? "Vous ne pouvez pas changer votre propre rôle"
                      : "Changer le rôle"
                  }
                  className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-semibold outline-none disabled:opacity-60 ${ROLE_BADGE[u.role] || "bg-slate-100 text-slate-500"}`}
                >
                  <option value="commercial">Commercial</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrateur</option>
                </select>
                <button
                  onClick={() =>
                    setEditUser({
                      id: u.id,
                      name: u.name || "",
                      email: u.email || "",
                      role: u.role,
                      manager_id: u.manager_id ?? "",
                      first_name: u.first_name || "",
                      last_name: u.last_name || "",
                      password: "",
                    })
                  }
                  title="Modifier les informations"
                  className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"
                >
                  <Pencil size={15} />
                </button>
                {u.id !== current?.id && (
                  <button
                    onClick={() => remove(u)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
                <button
                  onClick={() => setDetailId(u.id)}
                  title="Voir la fiche"
                  className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-500/10"
                >
                  <Eye size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {detailId && (
        <UserDetailModal userId={detailId} onClose={() => setDetailId(null)} />
      )}

      {editUser && (
        <Modal
          title={`Modifier — ${editUser.name}`}
          onClose={() => setEditUser(null)}
          width="max-w-md"
        >
          <form onSubmit={submitEdit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Nom complet
              </label>
              <input
                className={inputCls}
                required
                value={editUser.name}
                onChange={(e) =>
                  setEditUser({ ...editUser, name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Prénom
                </label>
                <input
                  className={inputCls}
                  value={editUser.first_name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, first_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Nom
                </label>
                <input
                  className={inputCls}
                  value={editUser.last_name}
                  onChange={(e) =>
                    setEditUser({ ...editUser, last_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Email
              </label>
              <input
                className={inputCls}
                type="email"
                required
                value={editUser.email}
                onChange={(e) =>
                  setEditUser({ ...editUser, email: e.target.value })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Rôle
              </label>
              <select
                className={inputCls}
                value={editUser.role}
                onChange={(e) =>
                  setEditUser({
                    ...editUser,
                    role: e.target.value,
                    manager_id:
                      e.target.value === "commercial" ? editUser.manager_id : "",
                  })
                }
              >
                <option value="commercial">Commercial</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            {editUser.role === "commercial" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Manager
                </label>
                <select
                  className={inputCls}
                  value={editUser.manager_id}
                  onChange={(e) =>
                    setEditUser({ ...editUser, manager_id: e.target.value })
                  }
                >
                  <option value="">Sans manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Nouveau mot de passe{" "}
                <span className="font-normal text-slate-400">
                  (optionnel, min. 6 caractères)
                </span>
              </label>
              <input
                className={inputCls}
                type="password"
                minLength={6}
                value={editUser.password}
                onChange={(e) =>
                  setEditUser({ ...editUser, password: e.target.value })
                }
              />
            </div>
            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditUser(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={editBusy}
                className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
              >
                {editBusy ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {formOpen && (
        <Modal
          title="Ajouter un membre"
          onClose={() => setFormOpen(false)}
          width="max-w-md"
        >
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Nom *
                </label>
                <input
                  className={inputCls}
                  required
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Prénom *
                </label>
                <input
                  className={inputCls}
                  required
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Email
              </label>
              <input
                className={inputCls}
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Mot de passe
              </label>
              <input
                className={inputCls}
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Rôle
              </label>
              <select
                className={inputCls}
                value={form.role}
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                    manager_id:
                      e.target.value === "commercial" ? form.manager_id : "",
                  })
                }
              >
                <option value="commercial">Commercial</option>
                <option value="manager">Manager</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            {form.role === "commercial" && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">
                  Manager
                </label>
                <select
                  className={inputCls}
                  value={form.manager_id}
                  onChange={(e) =>
                    setForm({ ...form, manager_id: e.target.value })
                  }
                >
                  <option value="">Sans manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-600 dark:bg-rose-500/10">
                {error}
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-indigo-500 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-600 disabled:opacity-60"
              >
                {busy ? "Ajout…" : "Ajouter"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
