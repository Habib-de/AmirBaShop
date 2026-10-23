import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isPushSupported,
  getPermission,
  getExistingSubscription,
  enablePushNotifications,
  disablePushNotifications,
} from '../../services/pushService';

export default function EnablePushButton({ compact = false }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    setPermission(getPermission());
    getExistingSubscription().then(sub => setSubscribed(Boolean(sub)));
  }, []);

  if (!supported) {
    if (compact) return null;
    return (
      <div className="text-xs text-amir-dark/50 font-semibold">
        Push notifications aren't supported in this browser.
      </div>
    );
  }

  const handleEnable = async () => {
    setLoading(true);
    try {
      await enablePushNotifications();
      setSubscribed(true);
      setPermission('granted');
      toast.success('Notifications enabled 🔔', { icon: '✅' });
    } catch (err) {
      toast.error(err.message || 'Could not enable notifications');
      setPermission(getPermission());
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      await disablePushNotifications();
      setSubscribed(false);
      toast.success('Notifications disabled');
    } catch (err) {
      toast.error(err.message || 'Could not disable notifications');
    } finally {
      setLoading(false);
    }
  };

  /* ── Denied by user in browser settings ── */
  if (permission === 'denied') {
    return (
      <div className={`flex items-center gap-2 ${compact ? 'text-[11px]' : 'text-xs'} text-rose-600 font-bold`}>
        <BellOff size={14} />
        Notifications blocked — enable in browser settings.
      </div>
    );
  }

  /* ── Already subscribed ── */
  if (subscribed) {
    return (
      <button
        type="button"
        onClick={handleDisable}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 ${compact ? 'text-[11px] px-3 py-1.5' : 'text-xs px-4 py-2'} rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold hover:bg-emerald-100 disabled:opacity-50 transition-colors`}
      >
        {loading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
        Notifications on
      </button>
    );
  }

  /* ── Default state — enable button ── */
  return (
    <button
      type="button"
      onClick={handleEnable}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 ${compact ? 'text-[11px] px-3 py-1.5' : 'text-xs px-4 py-2'} rounded-full bg-amir-pink hover:bg-pink-400 text-amir-dark font-bold disabled:opacity-50 transition-colors active:scale-[0.99]`}
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Bell size={12} />}
      Enable notifications
    </button>
  );
}