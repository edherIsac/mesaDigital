import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Iniciar sesión | mesaDigital — Panel de administración (React.js y Tailwind CSS)"
        description="Página de inicio de sesión del panel mesaDigital — plantilla de administración con React.js y Tailwind CSS"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
