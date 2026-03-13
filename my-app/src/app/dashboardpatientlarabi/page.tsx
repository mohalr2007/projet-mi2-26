// made by mohamed
'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { logOutUser } from '../../utils/supabase/auth';

export default function PatientDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        setLoading(true);
        await logOutUser();
        router.push('/login');
    };

    return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-green-50">
            <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100 text-center max-w-2xl">
                <h1 className="text-4xl font-bold text-gray-800 mb-6">Tableau de bord - Patient</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    Ceci est une page de redirection temporaire après une connexion réussie en tant que Patient.
                </p>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-left">
                    <p className="font-semibold text-yellow-800">Note pour l'équipe Front-end :</p>
                    <p className="text-yellow-700 text-sm mt-1">
                        Vous pouvez complètement supprimer ce fichier ou remplacer son contenu par votre véritable design de dashboard.
                        Le système d'authentification (login/signup) redirige automatiquement ici les utilisateurs ayant le rôle 'patient'.
                    </p>
                </div>

                {/* made by mohamed - logout button for testing */}
                <button 
                    onClick={handleLogout}
                    disabled={loading}
                    className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow transition-colors font-medium disabled:opacity-50"
                >
                    {loading ? 'Déconnexion...' : 'Se déconnecter'}
                </button>
                {/* made by mohamed */}
            </div>
        </div>
    );
}
// made by mohamed
