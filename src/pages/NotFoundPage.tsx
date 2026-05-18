import {Link} from "react-router-dom";

export function NotFoundPage(){
      return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-950 text-white">
      <h1 className="text-6xl font-bold text-indigo-500">404</h1>
      <p className="text-gray-400">Page not found</p>
      <Link
        to="/chat"
        className="text-indigo-400 hover:underline"
      >
        Go to Chat
      </Link>
    </div>
  );
}