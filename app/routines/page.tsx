'use client';

import { useState, useEffect } from 'react';

interface Routine {
  id: string;
  user_id: string;
  user_name: string;
  routine_type: string;
  schedule_time: string;
  days_of_week: string[];
  is_active: boolean;
  created_at: string;
}

export default function RoutinesPage() {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/routines')
      .then(res => res.json())
      .then(data => {
        setRoutines(data.routines || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const dayNames: Record<string, string> = {
    mon: 'Lun',
    tue: 'Mar',
    wed: 'Mié',
    thu: 'Jue',
    fri: 'Vie',
    sat: 'Sáb',
    sun: 'Dom'
  };

  const routineLabels: Record<string, string> = {
    sleep: '😴 Sueño',
    medication: '💊 Medicación',
    exercise: '🏃 Ejercicio',
    nutrition: '🥗 Nutrición',
    checkup: '🩺 Chequeo'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-text-muted">Cargando rutinas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-ebano">
            Rutinas de Salud
          </h1>
          <p className="text-text-muted mt-1">
            Gestiona las rutinas de bienestar de los pacientes
          </p>
        </div>
      </div>

      {routines.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-ebano/10">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="font-display text-lg font-semibold text-ebano mb-2">
            No hay rutinas activas
          </h3>
          <p className="text-text-muted">
            Las rutinas de los pacientes aparecerán aquí cuando se configuren.
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
                  Tipo
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Horario
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Días
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-ebano">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ebano/10">
              {routines.map((routine) => (
                <tr key={routine.id} className="hover:bg-sanctuary/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-ebano">
                      {routine.user_name || 'Sin nombre'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-secondary">
                      {routineLabels[routine.routine_type] || routine.routine_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-text-secondary">
                      {routine.schedule_time}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {routine.days_of_week?.map((day) => (
                        <span
                          key={day}
                          className="px-2 py-1 text-xs rounded bg-barro/10 text-barro"
                        >
                          {dayNames[day] || day}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 text-xs rounded-full ${
                        routine.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {routine.is_active ? 'Activa' : 'Pausada'}
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
