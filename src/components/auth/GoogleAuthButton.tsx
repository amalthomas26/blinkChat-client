import { GoogleLogin } from "@react-oauth/google";

interface Props {
  onSuccess: (token: string) => void;
  isLoading?: boolean;
}

export const GoogleAuthButton: React.FC<Props> = ({ onSuccess }) => {
  return (
    <GoogleLogin
      onSuccess={(credentialResponse) => {
        if (credentialResponse.credential) {
          onSuccess(credentialResponse.credential);
        }
      }}
      onError={() => console.error("Google login failed")}
      useOneTap={false}
      theme="filled_black"
      shape="rectangular"
      size="large"
      text="continue_with"
      width="100%"
    />
  );
};

