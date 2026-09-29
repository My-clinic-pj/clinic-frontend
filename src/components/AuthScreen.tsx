import { useState } from 'react';
import { HeartPulse, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { phone: form.phone, password: form.password }
        : { username: form.username, phone: form.phone, password: form.password };
        
      const response = await api.post(endpoint, payload);
      
      const token = response.data?.data?.token || response.data?.token;
      const username = response.data?.data?.username || response.data?.username || 'User';
      const clinicId = response.data?.data?.clinicId || response.data?.clinicId;
      
      if (token) {
        login(token, username, clinicId);
      } else {
        console.log('Backend response:', response.data);
        throw new Error('No token received from server');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message ?? err.message ?? 'Authentication failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 text-center border-b border-gray-100">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-black mb-4">
            <HeartPulse className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-black tracking-tight">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isLogin ? 'Enter your details to access your clinic' : 'Register to manage your patients'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-100 text-center">
              {error}
            </div>
          )}
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input 
                required 
                value={form.username} 
                onChange={(e) => setForm({ ...form, username: e.target.value })} 
                className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" 
                placeholder="Dr. Smith" 
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input 
              required 
              value={form.phone} 
              onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" 
              placeholder="09xxxxxxxxx" 
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              required 
              type="password"
              value={form.password} 
              onChange={(e) => setForm({ ...form, password: e.target.value })} 
              className="w-full px-4 py-2.5 rounded-md border border-gray-300 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all text-sm" 
              placeholder="••••••••" 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>
        
        <div className="p-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              type="button" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setForm({ username: '', phone: '', password: '' });
              }} 
              className="text-black font-semibold hover:underline cursor-pointer"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
