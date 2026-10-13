import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Baby, Calendar, Palette, MessageCircle, Save, X, ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useRegistry } from '../context/RegistryContext';
import SEO from '../components/SEO';

export default function Registry() {
  const { user } = useAuth();
  const { getMyRegistry, createRegistry, updateRegistry } = useRegistry();
  const navigate = useNavigate();

  const existing = getMyRegistry();

  const [form, setForm] = useState({
    babyName: '',
    dueDate: '',
    theme: '',
    message: '',
    coverImage: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /* Prefill if editing */
  useEffect(() => {
    if (existing) {
      setForm({
        babyName: existing.babyName || '',
        dueDate: existing.dueDate || '',
        theme: existing.theme || '',
        message: existing.message || '',
        coverImage: existing.coverImage || '',
      });
    }
  }, [existing?.id]);

  if (!user) {
    return (
      <>
        <SEO title="Baby Registry" url="/registry" />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="text-5xl mb-3">🔒</div>
          <h1 className="text-xl font-black mb-3">Sign in to create a registry</h1>
          <Link to="/login" className="btn-primary inline-flex">Sign in</Link>
        </div>
      </>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.babyName.trim()) return setError('Baby name is required');
    if (!form.dueDate) return setError('Due date is required');

    setSaving(true);

    try {
      if (existing) {
        await updateRegistry(existing.id, {
          babyName: form.babyName.trim(),
          dueDate: form.dueDate,
          theme: form.theme.trim(),
          message: form.message.trim(),
          coverImage: form.coverImage.trim(),
        });
        toast.success('Registry updated', { icon: '✅' });
        navigate('/my-registry');
      } else {
        const res = await createRegistry(form);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        toast.success('Registry created!', { icon: '🍼' });
        navigate('/my-registry');
      }
    } catch (err) {
      setError('Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SEO
        title={existing ? 'Edit Registry' : 'Create Baby Registry'}
        description="Create a baby registry, share with friends & family, and track who gifted what."
        url="/registry"
        noIndex
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🍼</div>
          <h1 className="text-2xl sm:text-3xl font-black">
            {existing ? 'Edit your registry' : 'Create your baby registry'}
          </h1>
          <p className="text-xs sm:text-sm text-amir-dark/60 font-semibold mt-1">
            {existing
              ? 'Update your baby info and share link'
              : 'Let friends & family know exactly what you need for your little one'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card p-5 sm:p-6 space-y-4">

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
              <Baby size={11} className="inline mr-1" /> Baby name *
            </label>
            <input
              type="text"
              value={form.babyName}
              onChange={e => setForm({ ...form, babyName: e.target.value })}
              placeholder="e.g. Baby Amina, Little Peanut"
              maxLength={40}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
              <Calendar size={11} className="inline mr-1" /> Due date *
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
              <Palette size={11} className="inline mr-1" /> Nursery theme <span className="text-amir-dark/40 normal-case">(optional)</span>
            </label>
            <input
              type="text"
              value={form.theme}
              onChange={e => setForm({ ...form, theme: e.target.value })}
              placeholder="e.g. 🌸 Floral & soft pastels"
              maxLength={60}
              className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-semibold bg-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-amir-dark/60 mb-1.5">
              <MessageCircle size={11} className="inline mr-1" /> Personal message <span className="text-amir-dark/40 normal-case">(optional)</span>
            </label>
            <textarea
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              rows={3}
              maxLength={300}
              placeholder="We can't wait to meet our little one! Thank you for helping us prepare 💕"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-amir-pink outline-none text-sm font-medium resize-none bg-white leading-relaxed"
            />
            <p className="text-[10px] text-amir-dark/40 mt-0.5 text-right">
              {form.message.length}/300
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg">
              <X size={14} className="text-rose-500 shrink-0" />
              <p className="text-xs text-rose-600 font-semibold">{error}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {existing && (
              <Link
                to="/my-registry"
                className="flex-1 py-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm text-center transition-colors"
              >
                Cancel
              </Link>
            )}
            <button
              type="submit"
              disabled={saving}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold text-sm transition-all active:scale-[0.99] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-amir-dark border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : existing ? (
                <>
                  <Save size={14} /> Save changes
                </>
              ) : (
                <>
                  <Sparkles size={14} /> Create registry
                </>
              )}
            </button>
          </div>
        </form>

        {!existing && (
          <div className="mt-4 p-3 rounded-xl bg-amir-cream/60 flex items-start gap-2">
            <span className="text-base">💡</span>
            <p className="text-[11px] text-amir-dark/70 font-semibold leading-relaxed">
              After creating, you'll get a <strong>shareable link</strong> to send to family & friends. They can mark items as purchased so you don't get duplicates.
            </p>
          </div>
        )}
      </div>
    </>
  );
}