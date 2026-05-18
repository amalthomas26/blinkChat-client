import {Navigate,Outlet} from "react-router-dom";
import {useIsAuthenticated} from "../../store/auth.selectors";


export function PrivateRoute(){
    const isAuthenticated = useIsAuthenticated();

    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
    
}