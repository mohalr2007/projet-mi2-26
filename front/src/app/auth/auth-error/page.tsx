// made by mohamed
export default function AuthError() {
    return (
        <div className="flex h-screen w-full items-center justify-center p-4 bg-slate-50 dark:bg-slate-950">
            <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold text-red-600">Erreur d&apos;authentification</h1>
                <p className="text-gray-600 dark:text-slate-300">
                    Un problème est survenu lors de la connexion avec ce fournisseur.
                </p>
                <a href="/login" className="mt-4 block text-blue-600 dark:text-blue-400 hover:underline">
                    Retour à la page de connexion
                </a>
            </div>
        </div>
    )
}
// made by mohamed
