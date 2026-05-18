export const env = {
    API_URL: import.meta.env.VITE_API_URL as string,
    SOCKET_URL:import.meta.env.VITE_SOCKET_URL as string,
    GOOGLE_CLIENT_ID:import.meta.env.VITE_GOOGLE_CLIENT_ID as string,

} as const ; //as const makes it read only



