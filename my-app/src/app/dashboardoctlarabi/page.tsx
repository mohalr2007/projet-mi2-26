// made by mohamed
import React from 'react';

export default function DoctorDashboard() {
    return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-blue-50">
            <div className="bg-white p-12 rounded-2xl shadow-lg border border-gray-100 text-center max-w-2xl">
                <h1 className="text-4xl font-bold text-gray-800 mb-6">Tableau de bord - Docteur</h1>
                <p className="text-gray-600 mb-8 text-lg">
                    Ceci est une page de redirection temporaire après une connexion réussie en tant que Médecin.
                </p>

                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-left">
                    <p className="font-semibold text-yellow-800">Note pour l'équipe Front-end :</p>
                    <p className="text-yellow-700 text-sm mt-1">
                        Vous pouvez complètement supprimer ce fichier ou remplacer son contenu par votre véritable design de dashboard.
                        Le système d'authentification (login/signup) redirige automatiquement ici les utilisateurs ayant le rôle 'doctor'.
                    </p>
                </div>
            </div>
        </div>
    );
}
// made by mohamed
