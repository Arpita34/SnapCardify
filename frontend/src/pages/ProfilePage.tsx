import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import api from '../services/api';
import { useAuthStore } from '../store/useAuthStore';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [photoPreview, setPhotoPreview] = useState(user?.profilePicture || '');

  // Razorpay subscription
  const [payLoading, setPayLoading] = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleUpdateName = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.put('/users/profile', { name });
      updateUser({ name: data.data.name });
      showSuccess('Name updated successfully!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const { data } = await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateUser({ profilePicture: data.user.profilePicture });
      showSuccess('Profile picture updated!');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubscribe = async (plan: 'monthly' | 'yearly') => {
    setPayLoading(true);
    setError('');

    try {
      const { data } = await api.post('/subscriptions/create-order', { plan });
      const order = data.order;

      if (!order || !order.id) {
        setError('Failed to create payment order. Try again.');
        setPayLoading(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'GreetCraft Premium',
        description: `${plan === 'monthly' ? 'Monthly' : 'Yearly'} Subscription`,
        order_id: order.id,
        handler: async (response: any) => {
          // This runs after user completes payment inside Razorpay modal
          try {
            await api.post('/subscriptions/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              plan,
            });
            updateUser({ subscriptionStatus: 'premium' });
            showSuccess('Welcome to Premium!');
          } catch (verifyErr: any) {
            // handler errors don't bubble up, so we set state directly
            setError(verifyErr.response?.data?.message || 'Payment verification failed. Contact support.');
          } finally {
            setPayLoading(false);
          }
        },
        prefill: { name: user?.name, email: user?.email },
        theme: { color: '#2563eb' },
        modal: {
          ondismiss: () => {
            // user closed the modal without paying
            setPayLoading(false);
          },
        },
      };

      if (!(window as any).Razorpay) {
        setError('Razorpay SDK failed to load. Check your internet connection and refresh the page.');
        setPayLoading(false);
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setError(`Payment failed: ${response.error.description}`);
        setPayLoading(false);
      });
      rzp.open();
      // NOTE: don't call setPayLoading(false) here — modal is still open
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not initiate payment. Try again.');
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-10">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm mb-8 transition-colors">
          <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to home
        </button>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>

        {/* Alerts */}
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm">
            ✅ {successMsg}
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            ❌ {error}
          </div>
        )}

        {/* Profile Picture */}
        <div className="card p-6 mb-5 bg-white border border-gray-200 rounded shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">📸 Profile Picture</h2>
          <div className="flex items-center gap-5">
            <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                </div>
              )}
            </div>
            <div>
              <label className="btn-primary text-sm cursor-pointer">
                {uploading ? 'Uploading...' : '📷 Change Photo'}
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </label>
              <p className="text-gray-500 text-xs mt-2">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div className="card p-6 mb-5 bg-white border border-gray-200 rounded shadow-sm">
          <h2 className="text-base font-semibold text-gray-900 mb-5">✏️ Display Name</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="input-field flex-1"
            />
            <button onClick={handleUpdateName} disabled={saving || name === user?.name} className="btn-primary px-5">
              {saving ? '...' : 'Save'}
            </button>
          </div>
          <p className="text-gray-500 text-xs mt-2">{user?.email}</p>
        </div>

        {/* Subscription */}
        <div className="card p-6 bg-white border border-gray-200 rounded shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-semibold text-gray-900">👑 Subscription</h2>
            {user?.subscriptionStatus === 'premium' ? (
              <span className="badge-premium">PREMIUM ACTIVE</span>
            ) : (
              <span className="badge-free">FREE PLAN</span>
            )}
          </div>

          {user?.subscriptionStatus === 'premium' ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
              <p className="text-blue-800 font-medium">🎉 You have full access to all premium templates!</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-sm mb-5">Unlock all premium templates, no watermarks, priority support.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="card p-4 text-center border border-gray-200 bg-white">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monthly</p>
                  <p className="text-3xl font-bold text-gray-900">₹99</p>
                  <p className="text-gray-500 text-xs mb-4">/month</p>
                  <button onClick={() => handleSubscribe('monthly')} disabled={payLoading} className="btn-primary w-full text-sm py-2">
                    {payLoading ? '...' : 'Subscribe'}
                  </button>
                </div>
                <div className="card p-4 text-center border border-blue-500 relative bg-white">
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-2 py-0.5 text-[10px] font-bold rounded uppercase">BEST VALUE</span>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Yearly</p>
                  <p className="text-3xl font-bold text-gray-900">₹999</p>
                  <p className="text-gray-500 text-xs mb-4">/year</p>
                  <button onClick={() => handleSubscribe('yearly')} disabled={payLoading} className="btn-primary w-full text-sm py-2">
                    {payLoading ? '...' : 'Subscribe'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
