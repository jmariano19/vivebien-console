'use client';

import { useState, useEffect } from 'react';

interface CreditAccount {
  id: string;
  user_id: string;
  user_name: string;
  user_phone: string;
  credits_balance: number;
  subscription_status: string;
  subscription_plan: string | null;
  created_at: string;
}

interface CreditStats {
  total_users: number;
  total_credits: number;
  active_subscribers: number;
}

export default function CreditsPage() {
  const [accounts, setAccounts] = useState<CreditAccount[]>([]);
  const [stats, setStats] = useState<CreditStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/credits')
      .then(res => res.json())
      .then(data => {
        setAccounts(data.accounts || []);
        setStats(data.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted">Cargando créditos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-ebano">
          Gestión de Créditos
        </h1>
        <p className="text-text-muted mt-1">
          Administra los créditos y suscripciones de los pacientes
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-ebano/10">
            <div className="text-3xl mb-2">👥</div>
            <div className="text-2xl font-bold text-ebano">{stats.total_users}</div>
            <div className="text-text-muted text-sm">Usuarios totales</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-ebano/10">
            <div className="text-3xl mb-2">💎</div>
            <div className="text-2xl font-bold text-ebano">{stats.total_credits}</div>
            <div className="text-text-muted text-sm">Créditos en circulación</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-ebano/10">
            <div className="text-3xl mb-2">⭐</div>
            <div className="text-2xl font-bold text-ebano">{stats.active_subscribers}</div>
            <div className="text-text-muted text-sm">Suscriptores activos</div>
          </div>
        </div>
      )}

      {/* Credit Costs Reference */}
      <div className="bg-sanctuary rounded-2xl p-6 border border-ebano/10">
        <h3 className="font-display font-semibold text-ebano mb-3">
          Costo por Mensaje
        </h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <span className="text-text-secondary">Texto: <strong>1 crédito</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎤</span>
            <span className="text-text-secondary">Audio: <strong>3 créditos</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📷</span>
            <span className="text-text-secondary">Imagen: <strong>5 créditos</strong></span>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      {accounts.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-ebano/10">
          <div className="text-4xl mb-4">💳</div>
          <h3 className="font-display text-lg font-semibold text-ebano mb-2">
            No hay cuentas de crédito
          </h3>
          <p className="text-text-muted">
            Las cuentas de crédito aparecerán aquí cuando los usuarios comiencen a usar ViveBien.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-ebano/10 overflow-hidden">
          <table className="w-full">
            <thead className="bg-sanctuary">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Paciente
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Teléfono
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Créditos
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Suscripción
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebano/10">
              {accounts.map((account) => (
                <tr key={account.id} className="hover:bg-sanctuary/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-ebano">
                      {account.user_name || 'Sin nombre'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-secondary">
                      {account.user_phone}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`font-semibold ${
                        account.credits_balance > 20
                          ? 'text-green-600'
                          : account.credits_balance > 5
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {account.credits_balance}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        account.subscription_status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {account.subscription_status === 'active'
                        ? `✓ ${account.subscription_plan || 'Activa'}`
                        : 'Gratis'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
